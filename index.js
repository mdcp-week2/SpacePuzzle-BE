require("dotenv").config();

const app = require("./src/app");
const PORT = process.env.PORT || 8080;

// 서버 시작
app.listen(PORT, () => {
  console.log(`
  🚀 Server is running!
  ---------------------------
  Local: http://localhost:${PORT}
  ---------------------------
  `);
});
