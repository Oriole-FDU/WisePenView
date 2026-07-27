import type { MarkdownResourceResolver } from '@/components/Markdown';
import type { ISkillService, SkillFileNode } from '@/domains/Skill';
import { useLatest, useUnmount } from 'ahooks';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import {
  collectMarkdownResourceUrls,
  inferImageMimeType,
  isMarkdownSkillFile,
  isSkillImageFile,
  readMarkdownPreviewOffset,
  resolveRelativeSkillFile,
  scrollMarkdownPreviewToOffset,
} from '../utils/skillMarkdown';

type MarkdownEditorView = 'preview' | 'markdown';

interface UseSkillMarkdownPreviewOptions {
  editorContent: string;
  files: SkillFileNode[];
  onSelectFile: (fileId: string) => void;
  selectedFile: SkillFileNode | null;
  skill?: { resourceId: string };
  skillService: ISkillService;
  viewingVersion?: number;
}

export function useSkillMarkdownPreview({
  editorContent,
  files,
  onSelectFile,
  selectedFile,
  skill,
  skillService,
  viewingVersion,
}: UseSkillMarkdownPreviewOptions) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const assetUrlRef = useRef(new Map<string, string>());
  const [views, setViews] = useState<Record<string, MarkdownEditorView>>({});
  const [sourceOffsets, setSourceOffsets] = useState<Record<string, number>>({});
  const [previewRestoreRequests, setPreviewRestoreRequests] = useState<Record<string, number>>({});
  const [assetUrls, setAssetUrls] = useState<Record<string, string | null>>({});
  const selectedView = selectedFile ? (views[selectedFile.id] ?? 'markdown') : 'markdown';
  const sourceOffsetsLatest = useLatest(sourceOffsets);

  useUnmount(() => {
    assetUrlRef.current.forEach((url) => URL.revokeObjectURL(url));
    assetUrlRef.current.clear();
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：Markdown 图片引用、文件树或版本变化时加载尚未解析的本地资源。
   * 不可替代原因：图片 Blob 来自异步 Skill service，并需创建浏览器 Object URL。
   * cleanup：将本轮标记为 disposed，阻止旧异步结果写入新预览；URL 在 hook 卸载时统一释放。
   */
  useEffect(() => {
    const imageTargets = (() => {
      if (!selectedFile || !isMarkdownSkillFile(selectedFile)) return [];
      return collectMarkdownResourceUrls(editorContent)
        .map((url) => resolveRelativeSkillFile(files, selectedFile, url))
        .filter((file): file is SkillFileNode => Boolean(file && isSkillImageFile(file)));
    })();
    const missingFiles = imageTargets.filter((file) => !Object.hasOwn(assetUrls, file.id));
    if (missingFiles.length === 0) return;
    let disposed = false;
    void Promise.all(
      missingFiles.map(async (file) => {
        try {
          const source =
            file.contentBlob ??
            (skill?.resourceId && file.objectKey
              ? await skillService.loadAssetBlob(skill.resourceId, file.objectKey, viewingVersion)
              : null);
          if (!source) return { id: file.id, url: null };
          // 后端历史数据会以 .txt 对象保存图片，不能沿用 OSS 响应声明的 text/plain MIME。
          const blob = new Blob([source], { type: inferImageMimeType(file) });
          return { id: file.id, url: URL.createObjectURL(blob) };
        } catch {
          return { id: file.id, url: null };
        }
      })
    ).then((results) => {
      if (disposed) {
        results.forEach((result) => result.url && URL.revokeObjectURL(result.url));
        return;
      }
      setAssetUrls((current) => {
        const next = { ...current };
        results.forEach((result) => {
          if (result.url) assetUrlRef.current.set(result.id, result.url);
          next[result.id] = result.url;
        });
        return next;
      });
    });
    return () => {
      disposed = true;
    };
  }, [
    assetUrls,
    editorContent,
    files,
    selectedFile,
    skill?.resourceId,
    skillService,
    viewingVersion,
  ]);

  /**
   * @wisepen-manual-effect
   * 执行时机：预览视图、内容或恢复请求变化后，在下一帧恢复 Markdown 滚动位置。
   * 不可替代原因：预览 DOM 只在提交后存在，滚动位置必须通过真实元素命令式恢复。
   * cleanup：取消尚未执行的 animation frame，避免旧文件修改新预览滚动位置。
   */
  useEffect(() => {
    if (!selectedFile || selectedView !== 'preview') return;
    const sourceOffset = sourceOffsetsLatest.current[selectedFile.id];
    if (sourceOffset == null) return;
    const frame = window.requestAnimationFrame(() => {
      const preview = previewRef.current;
      if (preview) scrollMarkdownPreviewToOffset(preview, sourceOffset);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    assetUrls,
    editorContent,
    previewRestoreRequests,
    selectedFile,
    selectedView,
    sourceOffsetsLatest,
  ]);

  const onViewChange = (nextKey: string) => {
    if (!selectedFile || (nextKey !== 'preview' && nextKey !== 'markdown')) return;
    if (nextKey === 'preview') {
      const editor = editorRef.current;
      const model = editor?.getModel();
      const range = editor?.getVisibleRanges()[0];
      const position = range
        ? { lineNumber: range.startLineNumber, column: range.startColumn }
        : editor?.getPosition();
      if (model && position) {
        setSourceOffsets((current) => ({
          ...current,
          [selectedFile.id]: model.getOffsetAt(position),
        }));
      }
      setPreviewRestoreRequests((current) => ({
        ...current,
        [selectedFile.id]: (current[selectedFile.id] ?? 0) + 1,
      }));
    } else {
      const sourceOffset = previewRef.current
        ? readMarkdownPreviewOffset(previewRef.current)
        : null;
      if (sourceOffset != null) {
        setSourceOffsets((current) => ({ ...current, [selectedFile.id]: sourceOffset }));
      }
    }
    setViews((current) => ({ ...current, [selectedFile.id]: nextKey }));
  };

  const onEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    if (!selectedFile || !isMarkdownSkillFile(selectedFile)) return;
    const sourceOffset = sourceOffsets[selectedFile.id];
    const model = editor.getModel();
    if (sourceOffset == null || !model) return;
    const position = model.getPositionAt(Math.min(sourceOffset, model.getValueLength()));
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
  };

  const onPreviewScroll = (container: HTMLDivElement) => {
    if (!selectedFile) return;
    const sourceOffset = readMarkdownPreviewOffset(container);
    if (sourceOffset == null) return;
    setSourceOffsets((current) =>
      current[selectedFile.id] === sourceOffset
        ? current
        : { ...current, [selectedFile.id]: sourceOffset }
    );
  };

  const resourceResolver: MarkdownResourceResolver | undefined =
    selectedFile && isMarkdownSkillFile(selectedFile)
      ? {
          resolveUrl: (url, kind) => {
            if (url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(url)) {
              return undefined;
            }
            const target = resolveRelativeSkillFile(files, selectedFile, url);
            if (!target) return null;
            if (isMarkdownSkillFile(target)) {
              return kind === 'link' ? `#skill-file-${target.id}` : null;
            }
            return isSkillImageFile(target) ? (assetUrls[target.id] ?? null) : null;
          },
          onLinkClick: (url) => {
            const target = resolveRelativeSkillFile(files, selectedFile, url);
            if (!target || !isMarkdownSkillFile(target)) return false;
            onSelectFile(target.id);
            return true;
          },
        }
      : undefined;

  return {
    onEditorMount,
    onPreviewScroll,
    onViewChange,
    previewRef,
    resourceResolver,
    selectedView,
  };
}
