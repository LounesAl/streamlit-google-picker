import React, { useCallback, useEffect, useState, ReactElement } from "react"
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib"
import styles from "./GooglePicker.module.css"
import {DriveIcon, FileIcon, XIcon} from "./icons"
import { EXT_TO_MIME } from "./googlePickerHelpers"

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

type GoogleDriveFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  [key: string]: any // extra fields (icon, size, etc)
}

function GooglePickerComponent({
  args,
  disabled,
  theme,
}: ComponentProps): ReactElement {
  const {
    apiKey,
    appId,
    token,
    scopes = "https://www.googleapis.com/auth/drive.file",
    accept_multiple_files = false,
    type = null,
    allow_folders = true,
    view_ids = null,
    nav_hidden = false,
  } = args

  const [pickerApiLoaded, setPickerApiLoaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickedFiles, setPickedFiles] = useState<GoogleDriveFile[]>([])

  useEffect(() => {
    if (!window.gapi) {
      const script = document.createElement("script")
      script.src = "https://apis.google.com/js/api.js"
      script.async = true
      script.onload = () => {
        window.gapi.load("client:picker", () => setPickerApiLoaded(true))
      }
      document.body.appendChild(script)
    } else {
      window.gapi.load("client:picker", () => setPickerApiLoaded(true))
    }
  }, [])

  useEffect(() => {
    Streamlit.setFrameHeight(pickerOpen ? 600 : 80 + 50 * pickedFiles.length)
  }, [pickerOpen, pickedFiles.length])

  // On every list change: send full list to backend + debug print
  useEffect(() => {
    Streamlit.setComponentValue(pickedFiles)
  }, [pickedFiles])

  // === HANDLER: Show Google Picker ===
  const showPicker = useCallback(() => {
    setPickerOpen(true)
    if (!window.google?.picker) {
      alert("Google Picker not loaded yet!")
      return
    }
    if (!token) {
      alert("No Google OAuth token provided!")
      return
    }

    let views: any[] = []
    let viewIds = view_ids || ["DOCS"]

    viewIds.forEach((vid: string) => {
      if (vid === "FOLDERS") {
        const folderView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setIncludeFolders(true)
        views.push(folderView)
      } else {
        const docView = new window.google.picker.DocsView(window.google.picker.ViewId[vid] || vid)
          .setSelectFolderEnabled(allow_folders)
          .setIncludeFolders(allow_folders)
        if (type) {
          let mimes: string[] = []
          if (Array.isArray(type)) {
            mimes = type.map((t: string) => EXT_TO_MIME[t] || t)
          } else if (typeof type === "string") {
            mimes = [EXT_TO_MIME[type] || type]
          }
          docView.setMimeTypes(mimes.join(","))
        }
        views.push(docView)
      }
    })

    let pickerBuilder = new window.google.picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.CANCEL) {
          setPickerOpen(false)
        }
        if (data.action === window.google.picker.Action.PICKED) {
          let newFiles: GoogleDriveFile[] = data.docs || []
          // If not accept_multiple_files, keep only 1
          if (!accept_multiple_files && newFiles.length > 0) {
            setPickedFiles([newFiles[0]])
          } else {
            // Merge: add any not-already-present files by id
            setPickedFiles(prev => {
              const prevIds = new Set(prev.map(f => f.id))
              const uniqueNew = newFiles.filter(f => !prevIds.has(f.id))
              return [...prev, ...uniqueNew]
            })
          }
          setPickerOpen(false)
        }
      })

    views.forEach((v) => pickerBuilder.addView(v))

    if (accept_multiple_files && window.google.picker.Feature) {
      pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
    }

    if (nav_hidden && window.google.picker.Feature) {
      pickerBuilder.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
    }

    pickerBuilder.build().setVisible(true)
  }, [
    token, apiKey, appId,
    accept_multiple_files, type, allow_folders, view_ids, nav_hidden
  ])

  // === HANDLER: Remove file from list ===
  const handleRemoveFile = (id: string) => {
    setPickedFiles(prev => prev.filter(f => f.id !== id))
  }

  // === RENDER UI ===
  return (
    <>
      <section
        role="presentation"
        tabIndex={0}
        aria-label="Pick from Google Drive"
        className={styles.uploader}
        data-testid="stFileUploaderDropzone"
      >
      <div className={styles.info}>
          <DriveIcon />
        <div className={styles.texts}>
          <span className={styles.title}>Pick files from Google Drive</span>
          <small className={styles.subtitle}>Limit 200MB per file</small>
          </div>
        </div>
        <button
          className={styles.button}
          onClick={showPicker}
          disabled={disabled || !pickerApiLoaded || !token}
          aria-label="Pick file from Drive"
          data-testid="stBaseButton-secondary"
        >
          Browse Drive
        </button>
      </section>

      {/* BELOW the gray box: File list, same as Streamlit */}
      {pickedFiles.length > 0 && (
        <ul className={styles.fileList}>
          {pickedFiles.map((file) => (
            <li key={file.id}>
              <div className={styles.fileRow} data-testid="stFileUploaderFile">
                {/* Everything left of the X */}
                <div className={styles.fileInfo}>
                  <div className={styles.fileIcon}>
                    <FileIcon />
                  </div>
                  <div className={styles.fileMain}>
                    <div className={styles.fileName} title={file.name}>{file.name}</div>
                    <small className={styles.fileSize}>
                      {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)}KB` : ""}
                    </small>
                  </div>
                </div>
                {/* The X at the far right */}
                <div className={styles.removeBtnContainer} data-testid="stFileUploaderDeleteBtn">
                  <button
                    className={styles.removeBtn}
                    aria-label="Remove file"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default withStreamlitConnection(GooglePickerComponent)
