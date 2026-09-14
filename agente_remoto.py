import asyncio
import websockets
import json
import mss
import pyautogui
import base64
import sys
from io import BytesIO
from PIL import Image

# Configurações do pyautogui para não ter delay e não falhar
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

# URL base do WebSocket do servidor
WS_BASE_URL = "wss://bragatreinamentos.com.br/ws/remote"

async def capture_and_send_screen(websocket):
    """
    Captura a tela em loop e envia via WebSocket em base64 (JPEG).
    """
    print("[*] Iniciando captura de tela...")
    with mss.mss() as sct:
        monitor = sct.monitors[1]  # Monitor principal
        
        while True:
            try:
                # Captura a tela
                sct_img = sct.grab(monitor)
                
                # Converte para PIL Image para redimensionar e comprimir
                img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
                
                # Redimensiona um pouco para não sobrecarregar a rede (ex: 720p)
                img.thumbnail((1280, 720), Image.Resampling.LANCZOS)
                
                # Salva em memória como JPEG
                buffer = BytesIO()
                img.save(buffer, format="JPEG", quality=40)  # Qualidade baixa para streaming super rápido
                img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                # Prepara a mensagem
                payload = {
                    "action": "screen_frame",
                    "image": img_str
                }
                
                # Envia via socket
                await websocket.send(json.dumps(payload))
                
                # Tenta manter uns 15-20 FPS (aguarda ~50ms)
                await asyncio.sleep(0.05)
                
            except websockets.exceptions.ConnectionClosed:
                print("[!] Conexão fechada. Parando captura de tela.")
                break
            except Exception as e:
                print(f"[!] Erro ao capturar tela: {e}")
                await asyncio.sleep(1)

async def listen_for_commands(websocket):
    """
    Escuta mensagens vindas do professor (mouse e teclado).
    """
    print("[*] Escutando comandos remotos...")
    screen_width, screen_height = pyautogui.size()
    
    try:
        async for message in websocket:
            data = json.loads(message)
            
            # Se a mensagem foi "refletida" de volta pra nós e não tiver action, ignora
            if 'action' not in data:
                continue
                
            action = data['action']
            
            # --- Tratamento de eventos de Mouse ---
            if action in ['mousemove', 'mousedown', 'mouseup']:
                # As coordenadas recebidas são normalizadas (0.0 até 1.0)
                x = int(data.get('x', 0) * screen_width)
                y = int(data.get('y', 0) * screen_height)
                button = data.get('button', 'left')
                
                # Mapeia botões do JS para pyautogui
                py_button = 'left'
                if button == 'right': py_button = 'right'
                elif button == 'middle': py_button = 'middle'
                
                try:
                    if action == 'mousemove':
                        pyautogui.moveTo(x, y)
                    elif action == 'mousedown':
                        pyautogui.moveTo(x, y)
                        pyautogui.mouseDown(button=py_button)
                    elif action == 'mouseup':
                        pyautogui.moveTo(x, y)
                        pyautogui.mouseUp(button=py_button)
                except Exception as e:
                    print(f"[!] Erro ao executar evento de mouse: {e}")
            
            # --- Tratamento de eventos de Teclado ---
            elif action == 'keydown':
                key = data.get('key', '')
                
                # Mapeamento simples de teclas do navegador para pyautogui
                key_map = {
                    'Enter': 'enter',
                    'Escape': 'esc',
                    'Backspace': 'backspace',
                    'Tab': 'tab',
                    'ArrowUp': 'up',
                    'ArrowDown': 'down',
                    'ArrowLeft': 'left',
                    'ArrowRight': 'right',
                    'Delete': 'delete',
                    'Shift': 'shift',
                    'Control': 'ctrl',
                    'Alt': 'alt',
                    'Meta': 'win'
                }
                
                py_key = key_map.get(key, key.lower())
                
                try:
                    # Se for apenas 1 caractere ou uma tecla mapeada, aperta ela
                    if len(py_key) == 1 or py_key in pyautogui.KEYBOARD_KEYS:
                        pyautogui.press(py_key)
                except Exception as e:
                    print(f"[!] Erro ao apertar tecla '{py_key}': {e}")
            
            elif action == 'finished':
                print("[*] O professor encerrou a sessão.")
                sys.exit(0)
                
    except websockets.exceptions.ConnectionClosed:
        print("[!] Conexão fechada.")
    except Exception as e:
        print(f"[!] Erro ao escutar mensagens: {e}")

async def start_agent(session_code):
    uri = f"{WS_BASE_URL}/{session_code}/"
    print(f"[*] Conectando ao servidor: {uri}")
    
    try:
        # Aumentamos o limite de tamanho para garantir que imagens passem
        async with websockets.connect(uri, max_size=10_000_000) as websocket:
            print("[+] Conectado com sucesso à sessão!")
            
            # Avisa o professor que o agente conectou
            await websocket.send(json.dumps({
                "action": "agent_connected"
            }))
            
            # Rodar as duas tarefas simultaneamente (enviar tela e escutar comandos)
            send_task = asyncio.create_task(capture_and_send_screen(websocket))
            listen_task = asyncio.create_task(listen_for_commands(websocket))
            
            await asyncio.gather(send_task, listen_task)
            
    except Exception as e:
        print(f"[!] Falha na conexão WebSocket: {e}")

if __name__ == "__main__":
    print("="*50)
    print(" AGENTE DE SUPORTE REMOTO - BRAGA TREINAMENTOS ")
    print("="*50)
    
    code = input("Digite o Código da Sessão (com os hífens): ").strip()
    
    if not code:
        print("Erro: O código da sessão não pode ser vazio.")
        sys.exit(1)
        
    try:
        asyncio.run(start_agent(code))
    except KeyboardInterrupt:
        print("\n[*] Agente encerrado pelo usuário.")
