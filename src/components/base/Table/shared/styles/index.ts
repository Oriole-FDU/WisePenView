import tableCellStylesModule from './cells.module.scss';
import tableStylesModule from './table.module.scss';

/** Table 共享样式模块（token、列宽） */
export const tableStyles = tableStylesModule;

/** 单元格内容辅助类（继承 .table__cell 字号，仅语义色/截断） */
export const tableCellStyles = tableCellStylesModule;
