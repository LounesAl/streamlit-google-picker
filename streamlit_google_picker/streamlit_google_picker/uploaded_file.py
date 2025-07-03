import io
import requests
from typing import List, Optional, Iterator, Union

class UploadedFile(io.BytesIO):
    def __init__(self, metadata: dict, token: str):
        self.metadata = metadata
        self.token = token
        self.name = metadata.get("name", "unknown")
        self.id = metadata.get("id")
        self.type = metadata.get("mimeType")
        self.url = metadata.get("url")
        self.size = metadata.get("sizeBytes")
        self._bytes: Optional[bytes] = None
        super().__init__()

    def read(self, *args, **kwargs) -> bytes:
        if self._bytes is None:
            self._download()
        self.seek(0)
        return super().read(*args, **kwargs)

    def getvalue(self) -> bytes:
        return self.read()

    def _download(self):
        if not self.id:
            raise RuntimeError("No file ID to download.")
        # Google Docs, Sheets, etc. need export, not download
        is_gdoc = self.type.startswith("application/vnd.google-apps.")
        if is_gdoc:
            export_mime_map = {
                "application/vnd.google-apps.document": "application/pdf",
                "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.google-apps.presentation": "application/pdf",
            }
            export_mime = export_mime_map.get(self.type)
            if not export_mime:
                raise RuntimeError(f"Don't know how to export {self.type}")
            download_url = f"https://www.googleapis.com/drive/v3/files/{self.id}/export?mimeType={export_mime}"
        else:
            download_url = f"https://www.googleapis.com/drive/v3/files/{self.id}?alt=media"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(download_url, headers=headers, stream=True)
        resp.raise_for_status()
        self._bytes = resp.content
        self.seek(0)
        self.write(self._bytes)
        self.seek(0)

    @property
    def size_bytes(self):
        return self.size

    def __repr__(self):
        return f"<UploadedFile name={self.name} id={self.id} type={self.type} size={self.size_bytes}>"

def list_files_in_folder(folder_id: str, token: str) -> List[dict]:
    """Recursively list all files (not folders) in a folder, including in subfolders."""
    files = []
    stack = [folder_id]
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "https://www.googleapis.com/drive/v3/files"
    params_base = {
        "fields": "files(id, name, mimeType, size, parents, webViewLink, iconLink, sizeBytes)",
        "pageSize": 1000,
        "supportsAllDrives": True,
        "includeItemsFromAllDrives": True,
    }

    while stack:
        current_folder_id = stack.pop()
        params = params_base.copy()
        params["q"] = f"'{current_folder_id}' in parents and trashed=false"
        resp = requests.get(base_url, headers=headers, params=params)
        resp.raise_for_status()
        for f in resp.json().get("files", []):
            if f["mimeType"] == "application/vnd.google-apps.folder":
                stack.append(f["id"])
            else:
                files.append(f)
    return files

def flatten_picker_result(items, token):
    files = []
    for item in items:
        # If it's a folder, list files inside recursively
        if (item.get("type") == "folder" or item.get("mimeType") == "application/vnd.google-apps.folder"):
            folder_files = list_files_in_folder(item["id"], token)
            for file_meta in folder_files:
                files.append(UploadedFile(file_meta, token))
        else:
            files.append(UploadedFile(item, token))
    return files

class GooglePickerResult:
    def __init__(self, picker_result: Union[dict, list], token: str):
        if isinstance(picker_result, dict):
            picker_result = [picker_result]
        self.files = flatten_picker_result(picker_result, token)

    def __iter__(self) -> Iterator[UploadedFile]:
        return iter(self.files)

    def __getitem__(self, idx) -> UploadedFile:
        return self.files[idx]

    def __len__(self):
        return len(self.files)

    def __repr__(self):
        return f"<GooglePickerResult files={self.files!r}>"
