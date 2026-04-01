Google Sign‑In setup and run (Windows, PowerShell)

1) Create a Google OAuth Client ID (Web)
- Go to https://console.cloud.google.com/apis/credentials
- Create Credentials → OAuth client ID → Application type: Web application
- Authorized JavaScript origins: http://localhost:3000
- Authorized redirect URIs: http://localhost:3000
- Copy the Client ID that ends with .apps.googleusercontent.com

2) Configure backend
- In PowerShell (this session):
  - $env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
- Or set GOOGLE_CLIENT_ID in your system environment variables and restart the IDE/terminal.

3) Configure frontend
- Copy tour_front/.env.example to tour_front/.env
- Edit tour_front/.env:
  - REACT_APP_API_URL=http://localhost:8080
  - REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

4) Run backend (Java 21)
- In PowerShell:
  - cd d:\General\developer\do-an-chuyen-nganh\tour_back
  - .\mvnw.cmd -DskipTests package
  - .\mvnw.cmd spring-boot:run

5) Run frontend (Node 18+ recommended)
- In a new PowerShell window:
  - cd d:\General\developer\do-an-chuyen-nganh\tour_front
  - npm install
  - npm start

6) Test login
- Open http://localhost:3000/login
- Click the Google button → complete the Google popup
- You should be redirected to /login-success and see you are logged in

Troubleshooting
- 400/401 on Google login: ensure GOOGLE_CLIENT_ID matches your frontend client ID and origins are set to http://localhost:3000
- CORS errors: backend allows http://localhost:3000 by default (see security.cors in application.yml)
- Database errors: verify MySQL is running and credentials in tour_back/src/main/resources/application.yml are correct
- Token refresh: we send { token: <refreshToken> } to /api/v1/auth/refresh-token per backend DTO