import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
// 配置CORS，允许所有跨域请求（开发环境）
const corsOptions = {
  origin: true, // 允许所有来源的请求
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的HTTP方法
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 允许的请求头
  credentials: true, // 允许携带凭证（cookies等）
  preflightContinue: false, // 不继续处理预检请求
  optionsSuccessStatus: 204 // 预检请求成功状态码
};

app.use(cors(corsOptions));

// 处理预检请求
app.options('*', cors(corsOptions));
app.use(express.json());

// 获取 __dirname（ESM 下没有默认 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------- 代理接口 -------------------
// 配置代理基础URL
const PROXY_BASE_URL = 'http://api.hclyz.com:81';

// 代理路由 - 自动添加基础URL前缀 (放在静态文件服务之前，确保优先匹配)
app.all("/api_proxy/*", async (req, res) => {
  try {
    // 获取相对路径（去掉/api_proxy/前缀）
    const relativePath = req.path.replace(/^\/api_proxy\//, '');
    // console.log("🌍 相对路径请求 ->", relativePath);
    // console.log("🌍 完整请求路径 ->", req.path);
    // console.log("📋 请求方法:", req.method);
    
    // 自动拼接完整的目标URL，确保没有多余的斜杠
    const targetUrl = `${PROXY_BASE_URL}/${relativePath}`.replace(/\/+/g, '/');
    // console.log("🔗 完整代理URL ->", targetUrl);
    
    // 创建请求头，移除可能导致问题的头信息
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;
    
    // 发送代理请求
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    
    console.log("✅ 代理响应状态码:", response.status);
    
    // 设置响应状态码
    res.status(response.status);
    
    // 复制响应头到客户端，但排除可能导致解码问题的头
    const excludedHeaders = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];
    response.headers.forEach((value, key) => {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    // 获取响应数据类型
    const contentType = response.headers.get('content-type');
    console.log("📄 响应内容类型:", contentType);
    
    try {
      // 在Node.js中，我们可以直接使用pipe方法将响应流转发给客户端
      // 确保正确设置content-type
      if (contentType) {
        res.setHeader('content-type', contentType);
      }
      
      // 直接将响应体的流传输给客户端
      return response.body.pipe(res);
    } catch (streamErr) {
      console.error("❌ 流式传输错误:", streamErr.message);
      // 降级方案：尝试以Buffer形式发送
      try {
        const buffer = await response.buffer();
        res.send(buffer);
      } catch (bufferErr) {
        console.error("❌ Buffer传输也失败:", bufferErr.message);
        // 最后尝试文本形式
        try {
          const textData = await response.text();
          res.send(textData);
        } catch (textErr) {
          console.error("❌ 所有传输方式都失败:", textErr.message);
          res.status(502).send({ error: "代理响应处理失败" });
        }
      }
    }
  } catch (err) {
    console.error("❌ Proxy Error:", err.message);
    res.status(500).send({ error: "代理请求失败", message: err.message });
  }
});

// ------------------- 静态目录 -------------------
// 注意：静态文件服务放在代理路由之后，但在Express中路由匹配是按顺序的
// 由于我们使用了特定的/api_proxy/*路径，静态文件服务不会影响代理路由
app.use(express.static(path.join(__dirname, "public"))); // public 下的文件会被直接访问

// ------------------- 启动 -------------------
const PORT = 80;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
