import AppIconButton from '@/components/Button/AppIconButton';
import { copyText } from '@/utils/browser/copyText';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import {
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';

const COPY_FEEDBACK_DURATION = 1200;

export interface CodeBlockLanguageOption {
  id: string;
  label: string;
}

interface CodeBlockToolbarProps {
  codeElement: HTMLElement;
  collapsed: boolean;
  isEditable: boolean;
  language: string;
  languageOptions: CodeBlockLanguageOption[];
  onCollapsedChange: (collapsed: boolean) => void;
  onLanguageChange: (language: string) => void;
}

function filterLanguageOptions(languageOptions: CodeBlockLanguageOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return languageOptions;
  }
  return languageOptions.filter(
    (option) =>
      option.id.toLowerCase().includes(normalizedQuery) ||
      option.label.toLowerCase().includes(normalizedQuery)
  );
}

export function CodeBlockToolbar({
  codeElement,
  collapsed: initialCollapsed,
  isEditable,
  language,
  languageOptions,
  onCollapsedChange,
  onLanguageChange,
}: CodeBlockToolbarProps) {
  const languageListId = useId();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [activeLanguageId, setActiveLanguageId] = useState(language);

  const selectedLanguageLabel =
    languageOptions.find((option) => option.id === selectedLanguage)?.label ?? selectedLanguage;

  const filteredLanguageOptions = filterLanguageOptions(languageOptions, query);
  const activeLanguageIndex = filteredLanguageOptions.findIndex(
    (option) => option.id === activeLanguageId
  );
  const activeLanguageOptionId =
    activeLanguageIndex >= 0 ? `${languageListId}-option-${activeLanguageIndex}` : undefined;

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const copied = await copyText(codeElement.textContent ?? '');
    if (copied) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
    }
  };

  const handleToggleCollapsed = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCollapsed((prev) => {
      const nextCollapsed = !prev;
      onCollapsedChange(nextCollapsed);
      return nextCollapsed;
    });
  };

  const handleToolbarPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleToolbarMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleToolbarClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleButtonMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleLanguageButtonClick = () => {
    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setActiveLanguageId(selectedLanguage);
      } else {
        setQuery('');
      }
      return nextOpen;
    });
  };

  const handleLanguageSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.currentTarget.value;
    const nextOptions = filterLanguageOptions(languageOptions, nextQuery);
    setQuery(nextQuery);
    setActiveLanguageId(nextOptions[0]?.id ?? '');
  };

  const handleSelectLanguage = (nextLanguage: string) => {
    setSelectedLanguage(nextLanguage);
    setActiveLanguageId(nextLanguage);
    setOpen(false);
    setQuery('');
    onLanguageChange(nextLanguage);
  };

  const handleLanguageBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }
    setOpen(false);
    setQuery('');
  };

  const moveActiveLanguage = (direction: 1 | -1) => {
    if (filteredLanguageOptions.length === 0) {
      return;
    }

    const currentIndex = filteredLanguageOptions.findIndex(
      (option) => option.id === activeLanguageId
    );
    const fallbackIndex = direction === 1 ? -1 : 0;
    const nextIndex = (currentIndex === -1 ? fallbackIndex : currentIndex) + direction;
    const wrappedIndex =
      (nextIndex + filteredLanguageOptions.length) % filteredLanguageOptions.length;

    setActiveLanguageId(filteredLanguageOptions[wrappedIndex].id);
  };

  const handleLanguageMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveLanguageId(selectedLanguage);
          return;
        }
        moveActiveLanguage(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveLanguageId(selectedLanguage);
          return;
        }
        moveActiveLanguage(-1);
        break;
      case 'Home':
        if (open && filteredLanguageOptions[0]) {
          event.preventDefault();
          setActiveLanguageId(filteredLanguageOptions[0].id);
        }
        break;
      case 'End':
        if (open && filteredLanguageOptions[filteredLanguageOptions.length - 1]) {
          event.preventDefault();
          setActiveLanguageId(filteredLanguageOptions[filteredLanguageOptions.length - 1].id);
        }
        break;
      case 'Enter':
        if (open && activeLanguageId) {
          event.preventDefault();
          handleSelectLanguage(activeLanguageId);
        }
        break;
      case 'Escape':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  return (
    <div
      className={`wise-code-block-toolbar${open ? ' wise-code-block-toolbarOpen' : ''}`}
      onPointerDown={handleToolbarPointerDown}
      onMouseDown={handleToolbarMouseDown}
      onClick={handleToolbarClick}
      onKeyDown={handleToolbarKeyDown}
    >
      <div
        className="wise-code-block-language"
        onBlur={handleLanguageBlur}
        onKeyDown={handleLanguageMenuKeyDown}
      >
        <button
          type="button"
          className="wise-code-block-languageButton"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? languageListId : undefined}
          disabled={!isEditable}
          onClick={handleLanguageButtonClick}
          onMouseDown={handleButtonMouseDown}
        >
          <span className="wise-code-block-languageLabel">{selectedLanguageLabel}</span>
          <ChevronDown className="wise-code-block-languageChevron" size={13} aria-hidden="true" />
        </button>

        {open && (
          <div className="wise-code-block-languagePopover">
            <input
              className="wise-code-block-languageInput"
              aria-label="搜索代码语言"
              value={query}
              onChange={handleLanguageSearchChange}
              placeholder="搜索语言"
              autoComplete="off"
              aria-controls={languageListId}
              aria-activedescendant={activeLanguageOptionId}
              autoFocus
            />
            <div
              id={languageListId}
              className="wise-code-block-languageList"
              role="listbox"
              aria-label="代码语言"
            >
              {filteredLanguageOptions.map((option, index) => (
                <button
                  key={option.id}
                  id={`${languageListId}-option-${index}`}
                  type="button"
                  className="wise-code-block-languageOption"
                  aria-selected={option.id === selectedLanguage}
                  data-active={option.id === activeLanguageId}
                  role="option"
                  onClick={() => handleSelectLanguage(option.id)}
                  onMouseEnter={() => setActiveLanguageId(option.id)}
                  onMouseDown={handleButtonMouseDown}
                >
                  <span>{option.label}</span>
                  {option.id === selectedLanguage && (
                    <Check className="wise-code-block-languageCheck" size={13} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wise-code-block-actions">
        <AppIconButton
          icon={
            collapsed ? (
              <ChevronDown className="wise-code-block-actionIcon" size={13} aria-hidden="true" />
            ) : (
              <ChevronUp className="wise-code-block-actionIcon" size={13} aria-hidden="true" />
            )
          }
          label={collapsed ? '展开代码块' : '折叠代码块'}
          size="sm"
          className="wise-code-block-iconButton"
          aria-expanded={!collapsed}
          data-collapsed={collapsed}
          tooltip={{ content: collapsed ? '展开' : '折叠' }}
          onMouseDown={handleButtonMouseDown}
          onClick={handleToggleCollapsed}
        />

        <AppIconButton
          icon={
            copied ? (
              <Check className="wise-code-block-actionIcon" size={13} aria-hidden="true" />
            ) : (
              <Copy className="wise-code-block-actionIcon" size={13} aria-hidden="true" />
            )
          }
          label={copied ? '已复制代码' : '复制代码'}
          size="sm"
          isActive={copied}
          className="wise-code-block-iconButton"
          data-copied={copied}
          tooltip={{ content: copied ? '已复制' : '复制' }}
          onMouseDown={handleButtonMouseDown}
          onClick={handleCopy}
        />
      </div>
    </div>
  );
}
