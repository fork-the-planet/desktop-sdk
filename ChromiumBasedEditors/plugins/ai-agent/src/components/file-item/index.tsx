import { Icon } from "@/components/icon";
import type { TAttachmentFile } from "@/lib/types";
import {
  cn,
  isDocument,
  isPdf,
  isPresentation,
  isSpreadsheet,
} from "@/lib/utils";
import useAttachmentsStore from "@/store/useAttachmentsStore";
import { IconButton } from "../icon-button";

type FileItemProps = {
  file: TAttachmentFile;
  withoutClose?: boolean;
};

const getFileIconName = (
  isPDFFile: boolean,
  isDocumentFile: boolean,
  isSpreadsheetFile: boolean,
  isPresentationFile: boolean
): string => {
  if (isPDFFile) return "pdf";
  if (isDocumentFile) return "documents";
  if (isSpreadsheetFile) return "spreadsheets";
  if (isPresentationFile) return "presentations";
  return "unknown-format";
};

const FileItem = ({ file, withoutClose }: FileItemProps) => {
  const { deleteAttachmentFile } = useAttachmentsStore();

  const handleDelete = () => {
    deleteAttachmentFile(file.path);
  };

  const name = file.path.includes("\\")
    ? (file.path.split("\\").pop() ?? "")
    : (file.path.split("/").pop() ?? "");
  const extension = name.split(".").pop() ?? "";
  const nameWithoutExtension = name.replace(`.${extension}`, "");

  const isDocumentFile = isDocument(file.type);
  const isPDFFile = isPdf(file.type);
  const isSpreadsheetFile = isSpreadsheet(file.type);
  const isPresentationFile = isPresentation(file.type);

  const iconName = getFileIconName(
    isPDFFile,
    isDocumentFile,
    isSpreadsheetFile,
    isPresentationFile
  );

  return (
    <div
      className={cn(
        " w-fit flex flex-row items-center gap-[12px] h-[36px] rounded-[8px] p-[4px] box-border border-[var(--file-items-border-color)]",
        withoutClose ? "cursor-pointer pe-[24px]" : "",
        withoutClose
          ? "bg-[var(--file-items-chat-background-color)]"
          : "border bg-[var(--file-items-background-color)]",
        withoutClose
          ? "hover:bg-[var(--file-items-chat-hover-background-color)]"
          : "",
        withoutClose
          ? "active:bg-[var(--file-items-chat-pressed-background-color)]"
          : ""
      )}
      onClick={() => {
        if (!withoutClose) return;

        window.AscDesktopEditor.openTemplate(file.path, name);
      }}
    >
      {file.isImage ? (
        <img className="h-[24px]" src={file.content} alt="" />
      ) : (
        <div className="flex flex-row items-center h-[24px] gap-[4px]">
          <Icon name={iconName} size={24} noColor />
          <p className="text-[var(--file-items-color)] font-normal text-[14px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
            {nameWithoutExtension}
            <span className="text-[var(--file-items-ext-color)]">
              .{extension}
            </span>
          </p>
        </div>
      )}

      {!withoutClose ? (
        <IconButton
          iconName="btn-close.small"
          size={16}
          onClick={handleDelete}
        />
      ) : null}
    </div>
  );
};

export { FileItem };
