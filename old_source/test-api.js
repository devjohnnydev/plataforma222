const API_URL = 'http://localhost:3001/api';

async function test() {
    try {
        console.log('--- Phase 1: Teacher Creation (via Admin) ---');
        const teacherRes = await fetch(`${API_URL}/admin/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'mestre' + Math.random() + '@teste.com',
                password: '123',
                name: 'Mestre Teste'
            })
        });
        let teacher = await teacherRes.json();
        console.log('Teacher created:', teacher);

        console.log('\n--- Phase 2: Create Class ---');
        const classRes = await fetch(`${API_URL}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Guilda de Teste',
                subject: 'Teste',
                teacherId: teacher.id
            })
        });
        const classData = await classRes.json();
        console.log('Class created:', classData);
        const joinCode = classData.joinCode;

        console.log('\n--- Phase 3: Create Mission ---');
        const missionRes = await fetch(`${API_URL}/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Missão 1',
                description: 'Teste',
                maxScore: 100,
                classId: classData.id
            })
        });
        const mission = await missionRes.json();
        console.log('Mission created:', mission);

        console.log('\n--- Phase 4: Student Registration ---');
        const studentRes = await fetch(`${API_URL}/auth/register-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'aprendiz' + Math.random() + '@teste.com',
                password: '123',
                name: 'Aprendiz Teste',
                joinCode: joinCode
            })
        });
        const student = await studentRes.json();
        console.log('Student registered:', student);

        console.log('\n--- Phase 5: Check Pending Enrollments (Teacher Side) ---');
        const pendingRes = await fetch(`${API_URL}/enrollments/pending?classId=${classData.id}`);
        const pending = await pendingRes.json();
        console.log('Pending enrollments:', pending);

        if (pending.length > 0) {
            const enrollmentId = pending[0].id;
            console.log('\n--- Phase 6: Approve Enrollment ---');
            const approveRes = await fetch(`${API_URL}/enrollments/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrollmentId: enrollmentId, status: 'APPROVED' })
            });
            console.log('Approval status response:', await approveRes.status);
        }

        console.log('\n--- Phase 7: Verify Mission Visibility (Student/Teacher) ---');
        const studentMissionsRes = await fetch(`${API_URL}/activities?classId=${classData.id}`);
        const studentMissions = await studentMissionsRes.json();
        console.log('Missions retrieved for class:', studentMissions);

        console.log('\n--- Phase 8: Verify Student in Ranking ---');
        const rankingRes = await fetch(`${API_URL}/ranking?classId=${classData.id}&username=johnny.oliveira@sp.senai.br`); // Use admin to see all
        const ranking = await rankingRes.json();
        console.log('Ranking:', ranking);

    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
