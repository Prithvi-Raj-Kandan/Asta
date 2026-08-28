import requests
import sys

def main():
    try:
        # 1. Login
        resp = requests.post(
            'http://localhost:8000/api/v1/auth/login',
            json={'email': 'john.doe@example.com', 'password': 'password123'}
        )
        if resp.status_code != 200:
            print("Login failed:", resp.text)
            sys.exit(1)
            
        token = resp.json().get('access_token')
        
        # 2. Chat
        chat_resp = requests.post(
            'http://localhost:8000/api/v1/chat/',
            json={'message': 'file my gstr-1 for 2026-08 in sandbox'},
            headers={'Authorization': f'Bearer {token}'}
        )
        
        print("CHAT RESPONSE:", chat_resp.json())
        
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
