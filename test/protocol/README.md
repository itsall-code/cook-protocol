# 协议测试框架

详细脚手架文档见上一层：

```text
../README.md
```

本目录只放协议测试框架代码。QA 推荐使用：

```bash
npm run protocol:list
npm run protocol:smoke -- --user qa_001 --host 192.168.110.17
npm run protocol:run -- bag --user qa_001 --host 192.168.110.17 0
```

协议声明文件位置：

```text
../../libs/generate/protocols.d.ts
```
