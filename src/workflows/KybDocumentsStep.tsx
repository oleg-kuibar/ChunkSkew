import { FileUp } from "lucide-react";

export function KybDocumentsStep({
  uploadedDocumentIds,
  onChange
}: {
  uploadedDocumentIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const docs = [
    { id: "doc_articles", label: "Articles of organization" },
    { id: "doc_ein", label: "EIN letter" },
    { id: "doc_bank", label: "Bank authorization" }
  ];

  return (
    <div className="document-grid" data-testid="kyb-documents-step">
      {docs.map((doc) => {
        const selected = uploadedDocumentIds.includes(doc.id);
        return (
          <button
            key={doc.id}
            className={selected ? "document-tile selected" : "document-tile"}
            type="button"
            onClick={() => onChange(selected ? uploadedDocumentIds.filter((id) => id !== doc.id) : [...uploadedDocumentIds, doc.id])}
          >
            <FileUp aria-hidden="true" />
            <strong>{doc.label}</strong>
            <span>{selected ? "Uploaded" : "Missing"}</span>
          </button>
        );
      })}
    </div>
  );
}
