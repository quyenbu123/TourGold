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

Deployment with Render + Vercel

1) Backend on Render
- Push repo lên GitHub.
- Trên Render, chọn `New +` -> `Blueprint` hoặc `Web Service`.
- Nếu dùng Blueprint, Render sẽ đọc [render.yaml](/f:/TourGold/render.yaml).
- Service backend dùng thư mục gốc `tour_back`, build command `./mvnw clean package -DskipTests`, start command `java -jar target/tour_back-0.0.1-SNAPSHOT.jar`.
- Khai báo biến môi trường theo [tour_back/.env.example](/f:/TourGold/tour_back/.env.example).
- Quan trọng nhất: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_BASE_URL`, cùng các biến payment/mail/cloudinary nếu bạn đang dùng những tính năng đó.

2) Frontend on Vercel
- Trên Vercel, import cùng repo nhưng đặt Root Directory là `tour_front`.
- Vercel sẽ dùng [tour_front/vercel.json](/f:/TourGold/tour_front/vercel.json) để rewrite SPA route về `index.html`.
- Khai báo env theo [tour_front/.env.example](/f:/TourGold/tour_front/.env.example).
- Bắt buộc: `REACT_APP_API_URL=https://<your-render-domain>`.

3) CORS và callback URL
- Sau khi có domain thật từ Vercel, cập nhật `CORS_ALLOWED_ORIGINS` trên Render để chứa domain đó.
- Cập nhật `APP_FRONTEND_BASE_URL` thành domain Vercel.
- Nếu dùng thanh toán, cập nhật `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, `VIETQR_REDIRECT_URL`, `VIETQR_IPN_URL` sang domain Render/Vercel thật.

4) Google Login
- Trong Google Cloud Console, thêm Authorized JavaScript Origin và Redirect URI cho domain Vercel thật của bạn.
- Đồng bộ `GOOGLE_CLIENT_ID` ở Render và `REACT_APP_GOOGLE_CLIENT_ID` ở Vercel.
