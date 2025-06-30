import os
import streamlit.components.v1 as components

_RELEASE = True

if not _RELEASE:
    _component_func = components.declare_component(
        "google_picker",
        url="http://localhost:3001",
    )
else:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("google_picker", path=build_dir)

def google_picker(
    label="Choose from Google Drive",
    token=None,
    apiKey=None,
    appId=None,
    clientId=None,
    scopes="https://www.googleapis.com/auth/drive.file",
    key=None,
):
    """
    Streamlit component for picking files from Google Drive via Google Picker.

    Parameters:
        label (str): Label to display on the button
        token (str): Google OAuth access token
        apiKey (str): Google Cloud API Key (public)
        appId (str): Google Cloud Project Number
        clientId (str): (facultatif) Google OAuth client_id
        scopes (str): (optionnel) Scopes à utiliser pour le Picker (par défaut: drive.file)
        key (str): Streamlit unique key for component
    Returns:
        dict or None: Information about the selected file(s)
    """
    component_value = _component_func(
        label=label,
        token=token,
        apiKey=apiKey,
        appId=appId,
        clientId=clientId,
        scopes=scopes,
        key=key,
        default=None,
    )
    return component_value
