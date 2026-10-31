# Speech 领域业务知识

> Canonical owner：`src/domains/Speech`

## 范围

本文件拥有语音凭证、识别生命周期与结果组装的共用规则；输入框合并、回复与 UI 限制由 [Chat workflow](../../components/business/Chat/BUSINESS.md) 拥有。

## 凭证与语言

- EOS 必须是 1000 至 10000 毫秒的整数；响应只接受 IFLYTEK，WebSocket URL 必须是 `wss:` 且 hostname 为 `iat-api.xfyun.cn`。这是目前前端信任边界，不可为配合 mock 任意放宽。依据：[mapIssueRecognitionCredentialRequest](mapper/SpeechServices.map.ts)、[mapRecognitionCredentialFromApi](mapper/SpeechServices.map.ts)。
- `expiresAt` 仅由响应映射，服务没有到期检查或自动刷新流程；不能把字段存在当成凭证有效性保证。依据：[mapRecognitionCredentialFromApi](mapper/SpeechServices.map.ts)、[createSpeechServices](service/SpeechServices.impl.ts)。
- 界面语言以不分大小写的 `en` 开头时使用 `en_us`，其他一律 `zh_cn`；不代表自动检测语音或支持其他语言。依据：[resolveXfyunSpeechLanguage](mapper/SpeechServices.map.ts)。

## 识别与文字

- 同一 module runtime 只允许一个 active recognizer，不是跨 tab 或后端的全局互斥。开始后使用 16kHz PCM，listening 满 55 秒调用 stop；stop 释放录音并送结束帧，进入 finishing 等最终结果，5 秒内未完成则失败。依据：[XfyunSpeechRecognizer](runtime/XfyunSpeechRecognizer.ts)。
- 正常收到最终 status 才触发完成回调；cancel 释放音频轨道、音频节点、socket 与 active slot，不视为正常完成。开始前错误拒绝 start，开始后错误走错误回调；不能把停止录音等同识别完成。依据：[XfyunSpeechRecognizer](runtime/XfyunSpeechRecognizer.ts)。
- transcript 每次以分片序号排序重建，同序号覆盖；`rpl` 先删除指定闭区间，再加入本次片段。结果可缩短或替换，不能只累加回调字符串。缺序号或替换范围会拒绝，单词目前取首个候选。依据：[XfyunResultAssembler](runtime/XfyunResultAssembler.ts)。

## Mock 与能力限制

- 目前 mock 凭证的 `speech.example.invalid` 不符合上述信任限制；离线 mock 的存在不代表可以启动识别。依据：[SpeechApi](mock/SpeechApi.mock.ts)、[mapRecognitionCredentialFromApi](mapper/SpeechServices.map.ts)。
- 麦克风、WebSocket、AudioWorklet 或结果替换目前没有专门的产品测试覆盖，不能由离线 mock 推论正式语音可用。依据：[XfyunSpeechRecognizer](runtime/XfyunSpeechRecognizer.ts)。
