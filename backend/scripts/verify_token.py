import requests

def test_token_endpoint():
    url = "http://localhost:8000/auth/token"
    # OAuth2PasswordRequestForm expects form data, NOT json
    payload = {
        "username": "jack@example.com",
        "password": "jack789"
    }
    try:
        response = requests.post(url, data=payload)
        if response.status_code == 200:
            print("Token endpoint successful!")
            print("Response:", response.json())
        else:
            print(f"Token endpoint failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to server: {e}")

if __name__ == "__main__":
    test_token_endpoint()
