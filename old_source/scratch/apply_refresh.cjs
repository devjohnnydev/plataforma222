const fs = require('fs');
const path = './src/DataContext.jsx';
let content = fs.readFileSync(path, 'utf8');

const statusSyncLogic = `
        setGrades(resExtra || []);
        
        // Downward sync: Check if portal challenge is already completed on the server
        try {
          const statusRes = await authFetch(\`\${API_URL}/aluno/status-desafio\`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.completado) {
              const todayStr = new Date().toDateString();
              localStorage.setItem('portalLastAttemptDate', todayStr);
              localStorage.setItem('portalAttemptResult', 'SUCCESS');
              // Ensure we have some display data so the card doesn't break
              if (!localStorage.getItem('portalAttemptScore')) {
                localStorage.setItem('portalAttemptScore', '5');
                localStorage.setItem('portalAttemptPuzzles', '5');
                localStorage.setItem('portalAttemptTimeSpent', '180');
              }
            }
          }
        } catch (e) {
          console.error("Failed to sync portal status down:", e);
        }
`;

content = content.replace(
  /setGrades\(resExtra\s*\|\|\s*\[\]\);/,
  statusSyncLogic.trim()
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated refreshAll in DataContext.jsx!');
