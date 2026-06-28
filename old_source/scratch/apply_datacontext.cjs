const fs = require('fs');

const path = './src/DataContext.jsx';
let content = fs.readFileSync(path, 'utf8');

const syncLogic = `
      // Automagically sync today's portal challenge score
      if (data.user.role === 'ALUNO') {
        const todayStr = new Date().toDateString();
        const lastAttemptDate = localStorage.getItem('portalLastAttemptDate');
        const attemptResult = localStorage.getItem('portalAttemptResult');
        const attemptScore = localStorage.getItem('portalAttemptScore');
        
        if (lastAttemptDate === todayStr && attemptResult === 'SUCCESS' && attemptScore) {
          try {
            await fetch(\`\${API_URL}/aluno/completar-desafio\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${data.token}\`
              },
              body: JSON.stringify({ score: parseInt(attemptScore) || 0 })
            });
            console.log("Desafio diário sincronizado com o servidor!");
          } catch (err) {
            console.error("Falha ao sincronizar desafio diário:", err);
          }
        }
      }
`;

// Replace in login
content = content.replace(
  /setUser\(data\.user\);\s+setNeedsRefresh\(true\);/,
  `setUser(data.user);\n${syncLogic}\n      setNeedsRefresh(true);`
);

const registerSyncLogic = `
      // Automagically sync today's portal challenge score for newly registered users
      if (result.user.role === 'ALUNO') {
        const todayStr = new Date().toDateString();
        const lastAttemptDate = localStorage.getItem('portalLastAttemptDate');
        const attemptResult = localStorage.getItem('portalAttemptResult');
        const attemptScore = localStorage.getItem('portalAttemptScore');
        
        if (lastAttemptDate === todayStr && attemptResult === 'SUCCESS' && attemptScore) {
          try {
            await fetch(\`\${API_URL}/aluno/completar-desafio\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${result.token}\`
              },
              body: JSON.stringify({ score: parseInt(attemptScore) || 0 })
            });
            console.log("Desafio diário sincronizado com o servidor!");
          } catch (err) {
            console.error("Falha ao sincronizar desafio diário:", err);
          }
        }
      }
`;

// Replace in registerStudent
content = content.replace(
  /setUser\(result\.user\);\s+setNeedsRefresh\(true\);/,
  `setUser(result.user);\n${registerSyncLogic}\n      setNeedsRefresh(true);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated DataContext.jsx!');
