/**
 * Máquina de estados de UI — evita botões mortos e estados contraditórios.
 */
export const UiState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  WAITING_PERMISSION: 'waiting-permission',
  SHARING: 'sharing',
  SELECTED_LIVE: 'selected-live',
  WATCHING: 'watching',
  PAUSED: 'paused',
  RECONNECTING: 'reconnecting',
  RECORDING: 'recording',
  ERROR: 'error'
};

export class UiStateMachine {
  constructor({ onChange } = {}) {
    this.state = UiState.IDLE;
    this.onChange = onChange || (() => {});
    this._flags = {
      hasSelection: false,
      isPaused: false,
      isSharing: false,
      isRecording: false,
      isUploading: false,
      isRecordingBusy: false,
      wsConnected: false,
      wsWasConnected: false,
      hasPreview: false
    };
  }

  set(partial) {
    Object.assign(this._flags, partial);
    const next = this._derive();
    if (next !== this.state) {
      this.state = next;
    }
    this.onChange(this.state, { ...this._flags });
    return this.state;
  }

  _derive() {
    const f = this._flags;
    if (f.isRecording) return UiState.RECORDING;
    if (!f.wsConnected && f.wsWasConnected) return UiState.RECONNECTING;
    if (!f.wsConnected) return UiState.CONNECTING;
    if (f.isPaused && f.hasSelection) return UiState.PAUSED;
    if (f.isSharing && f.hasSelection) return UiState.SELECTED_LIVE;
    if (f.isSharing) return UiState.SHARING;
    if (f.hasPreview) return UiState.WATCHING;
    if (f.wsConnected) return UiState.CONNECTED;
    return UiState.IDLE;
  }

  /** Controles host */
  canSelect() {
    return this._flags.wsConnected && !this._flags.isRecording;
  }

  canPause() {
    return this._flags.wsConnected && this._flags.hasSelection && !this._flags.isPaused;
  }

  canResume() {
    return this._flags.wsConnected && this._flags.hasSelection && this._flags.isPaused;
  }

  canRecord() {
    return (
      this._flags.wsConnected &&
      this._flags.hasPreview &&
      !this._flags.isRecording &&
      !this._flags.isUploading
    );
  }

  canStopRecord() {
    return this._flags.isRecording;
  }
}
