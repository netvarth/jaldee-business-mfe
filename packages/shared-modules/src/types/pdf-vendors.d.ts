declare module "html2canvas" {
  export interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    backgroundColor?: string | null;
  }

  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;
}

declare module "jspdf" {
  export class jsPDF {
    constructor(options?: any);
    internal: any;
    getImageProperties(data: string): { width: number; height: number };
    addImage(data: string, format: string, x: number, y: number, width: number, height: number): void;
    addPage(): void;
    output(type: "blob" | string): any;
  }
}

