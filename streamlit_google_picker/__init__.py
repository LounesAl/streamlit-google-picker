import os
from typing import Sequence, Optional, Union

import streamlit.components.v1 as components

from .uploaded_file import GooglePickerResult, prune_uploaded_file_cache

_RELEASE = True

if not _RELEASE: # Does not work with google picker api (conflict between streamlit and conponent ports 8501, 3001)
    _component_func = components.declare_component(
        "streamlit_google_picker",
        url="http://localhost:3001",
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("streamlit_google_picker", path=build_dir)

def google_picker(
    label: str = "Choose from Google Drive",
    token: Optional[str] = None,
    apiKey: Optional[str] = None,
    appId: Optional[str] = None,
    clientId: Optional[str] = None,
    accept_multiple_files: bool = False,
    type: Optional[Union[str, Sequence[str]]] = None,
    allow_folders: bool = False,
    view_ids: Optional[Sequence[str]] = None,  # e.g., ["DOCS", "SPREADSHEETS"]
    nav_hidden: bool = False,  # Hide the navigation pane if True
    key: Optional[str] = None,
):
    """
    Streamlit component for picking files from Google Drive via Google Picker.

    Parameters:
        label (str): Label to display on the button.
        token (str): Google OAuth access token.
        apiKey (str): Google Cloud API Key (public).
        appId (str): Google Cloud Project Number.
        clientId (str): (Optional) Google OAuth client_id.
        accept_multiple_files (bool): Allow selecting multiple files (default: False).
        type (str or Sequence[str]): Allowed file types/extensions or MIME types.
        allow_folders (bool): Allow selecting folders (default: False).
        view_ids (Sequence[str]): Google Picker View IDs, e.g., ["DOCS", "IMAGES"].
            https://developers.google.com/workspace/drive/picker/reference/picker.viewid
        nav_hidden (bool): Hide the navigation pane in picker (default: False).
        key (str): Streamlit unique key for the component.

    Returns:
        dict or None: Information about the selected file(s).
    """
    # Normalize `type` to always be a list for the JS side
    if type is not None and isinstance(type, str):
        type = [type]

    component_value = _component_func(
        label=label,
        token=token,
        apiKey=apiKey,
        appId=appId,
        clientId=clientId,
        accept_multiple_files=accept_multiple_files,
        type=type,
        allow_folders=allow_folders,
        view_ids=view_ids,
        nav_hidden=nav_hidden,
        key=key,
        default=None,
    )

    result = GooglePickerResult(component_value, token, use_cache=True)
    current_file_ids = [f.id for f in result]
    prune_uploaded_file_cache(current_file_ids)
    return result
