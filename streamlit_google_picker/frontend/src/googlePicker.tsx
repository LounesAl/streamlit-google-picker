import React, { useCallback, useEffect, useState, ReactElement } from "react"
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib"
import styles from "./GooglePicker.module.css"
import DriveIcon from "./driveIcon"
import { EXT_TO_MIME } from "./googlePickerHelpers"

declare global {
  interface Window {
    gapi: any
    google: any
  }
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
    Streamlit.setFrameHeight(pickerOpen ? 600 : 80)
  }, [pickerOpen])

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
          Streamlit.setComponentValue(
            accept_multiple_files ? data.docs : data.docs?.[0] || null
          )
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
  }, [token, apiKey, appId, accept_multiple_files, type, allow_folders, view_ids, nav_hidden])

  return (
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
  )
}

export default withStreamlitConnection(GooglePickerComponent)
