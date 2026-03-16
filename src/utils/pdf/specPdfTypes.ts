export interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export interface ListItem {
  spans: TextSpan[];
  indent: number;
}

export interface PdfBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'diagram' | 'blockquote' | 'code' | 'hr';
  level?: number;
  spans?: TextSpan[];
  items?: ListItem[];
  ordered?: boolean;
  tableRows?: TextSpan[][][];
  headerRowCount?: number;
  imageData?: string;
  imageWidth?: number;
  imageHeight?: number;
  domElement?: HTMLElement;
  codeText?: string;
}
