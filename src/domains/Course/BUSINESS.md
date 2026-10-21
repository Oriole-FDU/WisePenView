# Course 领域业务知识

## 范围

Course 是前端建立在 Group、Tag、Resource 与 Interact 服务上的聚合视图，不是独立后端 Course API。Course entity 与服务只表示目前 UI 使用的聚合模型。

## 规则

- Course 清单只查询 `GROUP_TYPE.ADVANCED`；详情也会拒绝非 ADVANCED Group。角色映射为 Group `OWNER` → Course `TEACHER`、`ADMIN` → `ASSISTANT`、其余 → `STUDENT`。依据：[CourseServices](service/CourseServices.impl.ts) 的 `listMyCourses`、`getCourseDetail`、[CourseServicesMap](mapper/CourseServices.map.ts) 的 `mapGroupRole`、`mapGroupToCourseDetail`。
- Course metadata 放在 Group `groupMetaInfo.course`，schema 为 `wisepen.course.v1`；已知栏位包括学期、类别、起讫日、大纲 root tag、学习目标、会议、评量与期末评量。序列化保留原 metadata 中未识别的 course 栏位及其他 Group 顶层 metadata。依据：[CourseServicesMap](mapper/CourseServices.map.ts) 的 `COURSE_META_SCHEMA`、`parseCourseMeta`、`serializeCourseMeta`。
- 建立 Course 依序建立 ADVANCED Group、新增「大纲内容」root tag，再回写 tag ID 至 Group metadata；此流程由多个 service 请求构成，前端程式未提供跨请求交易。依据：[CourseServices](service/CourseServices.impl.ts) 的 `createCourse`。
- 大纲的章节／节点由 Tag 树表示，节点资源从 Group resources 查询；资源已读状态取自 `myInteraction.read`。`calculateCourseOutlineProgress` 只对传入的 RESOURCE 节点按唯一 resource ID 计算，同资源任一节点已读即计为已读；这不代表所有 caller 已载入完整资源。章节资源顺序写在 tag metadata 的 `resourceOrder`。依据：[CourseServices](service/CourseServices.impl.ts) 的 `getCourseOutlineRoot`、`loadCourseOutlineResources`、`mountCourseOutlineResources`、[CourseServicesMap](mapper/CourseServices.map.ts) 的 `mapCourseOutlineResourceNodes`、`calculateCourseOutlineProgress`、`mapCourseOutlineResourceOrderMeta`。
- 目前 `getCourseHome` 只取得 `getCourseOutline` 的章节树，`mapCourseOutlineNodes` 仅产生 CHAPTER／SECTION，没有载入 RESOURCE 节点；因此此首页资料路径的已读数、资源总数与百分比均为零，不能当成真实课程资源或学习进度的统计。依据：[CourseServices](service/CourseServices.impl.ts) 的 `getCourseHome`、`getCourseOutline`、[CourseServicesMap](mapper/CourseServices.map.ts) 的 `mapCourseOutlineNodes`。
- 公告与作业 API 目前回报 `COURSE_SERVICE_UNAVAILABLE`；Course home 对公告及待办作业回传空集合。即使 UI 有公告／作业页面与暂存 entity，也不能视为此功能已接入正式服务。依据：[CourseServices](service/CourseServices.impl.ts) 的 `unavailable`、`getCourseHome`、`listCourseAnnouncements`、`listCourseAssignments`、`getCourseAssignment`、`submitCourseAssignment`。

## 尚未由前端证明的事项

Group／Tag／Resource 的正式权限、Course metadata 的后端验证与公告／作业未来资料模型不由此聚合实作证明。不要把目前 entity 栏位或 UI 页面当成已上线的服务契约。
