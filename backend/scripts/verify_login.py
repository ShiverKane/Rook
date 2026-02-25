import requests

def test_login():
    url = "http://localhost:8000/auth/login"
    payload = {
        "email": "jack@example.com",
        "password": "jack789"
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("Login successful!")
            print("Token:", response.json().get("access_token"))
        else:
            print(f"Login failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to server: {e}")

if __name__ == "__main__":
    test_login()
