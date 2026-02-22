import {YTMDPi} from '../../ytmd-pi';
import {PisAbstract} from '../pis.abstract';
import {DidReceiveSettingsEvent} from "streamdeck-typescript";
import {AlbumArtSettings} from "../../interfaces/context-settings.interface";

export class AlbumArtPi extends PisAbstract {
    constructor(pi: YTMDPi, context: string, sectionElement: HTMLElement) {
        super(pi, context, sectionElement);
        this.pi.albumArtSaveElement.onclick = () => this.saveSettings();
        pi.requestSettings();
    }

    public newSettingsReceived({payload: {settings}}: DidReceiveSettingsEvent<AlbumArtSettings>): void {
        this.pi.albumArtRowsElement.value = String(settings.rows ?? 2);
        this.pi.albumArtColsElement.value = String(settings.cols ?? 2);
        // UI uses 1-based indexing; settings stored as 0-based
        this.pi.albumArtRowElement.value = String((settings.row ?? 0) + 1);
        this.pi.albumArtColElement.value = String((settings.col ?? 0) + 1);
    }

    private saveSettings() {
        const rows = Math.min(5, Math.max(1, parseInt(this.pi.albumArtRowsElement.value) || 2));
        const cols = Math.min(5, Math.max(1, parseInt(this.pi.albumArtColsElement.value) || 2));
        // Convert from 1-based UI value to 0-based storage, clamped to valid range
        const row = Math.min(rows - 1, Math.max(0, (parseInt(this.pi.albumArtRowElement.value) || 1) - 1));
        const col = Math.min(cols - 1, Math.max(0, (parseInt(this.pi.albumArtColElement.value) || 1) - 1));

        this.settingsManager.setContextSettingsAttributes(this.context, {rows, cols, row, col});
    }
}
