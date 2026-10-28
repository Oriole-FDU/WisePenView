/**
 * 可观测性测试总入口。
 *
 * 统一由 Node test runner 加载核心管线、构建身份和源码映射回归测试。
 */
import './observability/core.test.mjs';
import './observability/request.test.mjs';
import './observability/sourceMaps.test.mjs';
