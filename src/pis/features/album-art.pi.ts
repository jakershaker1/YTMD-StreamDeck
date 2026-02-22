import {YTMDPi} from '../../ytmd-pi';
import {PisAbstract} from '../pis.abstract';
import {DidReceiveSettingsEvent} from "streamdeck-typescript";
import {AlbumArtSettings} from "../../interfaces/context-settings.interface";
import {GlobalSettingsInterface} from "../../interfaces/global-settings.interface";

export class AlbumArtPi extends PisAbstract {
    private positionPickerElement: HTMLElement;

    constructor(pi: YTMDPi, context: string, sectionElement: HTMLElement) {
        super(pi, context, sectionElement);
        this.positionPickerElement = document.getElementById('albumArtPositionPicker') as HTMLElement;
        this.pi.albumArtSaveElement.onclick = () => this.saveSettings();
        this.pi.albumArtRowsElement.oninput = () => this.handleGridSizeInputChanged();
        this.pi.albumArtColsElement.oninput = () => this.handleGridSizeInputChanged();
        this.renderPositionPicker();
        pi.requestGlobalSettings();
        pi.requestSettings();
    }

    public newSettingsReceived({payload: {settings}}: DidReceiveSettingsEvent<AlbumArtSettings>): void {
        const sharedGrid = this.getSharedGridSize();
        this.pi.albumArtRowsElement.value = String(sharedGrid.rows ?? settings.rows ?? 2);
        this.pi.albumArtColsElement.value = String(sharedGrid.cols ?? settings.cols ?? 2);
        this.pi.albumArtRowElement.value = String((settings.row ?? 0) + 1);
        this.pi.albumArtColElement.value = String((settings.col ?? 0) + 1);
        this.clampPositionToGrid();
        this.renderPositionPicker();
    }

    public newGlobalSettingsReceived(): void {
        const sharedGrid = this.getSharedGridSize();
        if (!sharedGrid.rows || !sharedGrid.cols) return;

        this.pi.albumArtRowsElement.value = String(sharedGrid.rows);
        this.pi.albumArtColsElement.value = String(sharedGrid.cols);
        this.clampPositionToGrid();
        this.renderPositionPicker();
    }

    private getSharedGridSize() {
        const globalSettings = this.settingsManager.getGlobalSettings<GlobalSettingsInterface>();
        const rows = Math.min(5, Math.max(1, parseInt(String(globalSettings?.albumArtRows ?? '')) || 0));
        const cols = Math.min(5, Math.max(1, parseInt(String(globalSettings?.albumArtCols ?? '')) || 0));
        return {
            rows: rows || undefined,
            cols: cols || undefined,
        };
    }

    private handleGridSizeInputChanged() {
        this.pi.albumArtRowsElement.value = String(this.getGridRows());
        this.pi.albumArtColsElement.value = String(this.getGridCols());
        this.clampPositionToGrid();
        this.saveSettings();
        this.renderPositionPicker();
    }

    private parseGridValue(value: string, fallback: number): number {
        return Math.min(5, Math.max(1, parseInt(value, 10) || fallback));
    }

    private getGridRows(): number {
        return this.parseGridValue(this.pi.albumArtRowsElement.value, 2);
    }

    private getGridCols(): number {
        return this.parseGridValue(this.pi.albumArtColsElement.value, 2);
    }

    private getButtonRow(): number {
        return this.parseGridValue(this.pi.albumArtRowElement.value, 1);
    }

    private getButtonCol(): number {
        return this.parseGridValue(this.pi.albumArtColElement.value, 1);
    }

    private clampPositionToGrid() {
        const rows = this.getGridRows();
        const cols = this.getGridCols();
        this.pi.albumArtRowElement.value = String(Math.min(rows, this.getButtonRow()));
        this.pi.albumArtColElement.value = String(Math.min(cols, this.getButtonCol()));
    }

    private renderPositionPicker() {
        this.positionPickerElement.classList.add('position-picker');
        this.positionPickerElement.innerHTML = '';

        const rows = this.getGridRows();
        const cols = this.getGridCols();
        const selectedRow = this.getButtonRow();
        const selectedCol = this.getButtonCol();

        this.positionPickerElement.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

        for (let rowIndex = 1; rowIndex <= rows; rowIndex++) {
            for (let colIndex = 1; colIndex <= cols; colIndex++) {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'album-art-grid-cell';
                cell.textContent = `${rowIndex},${colIndex}`;
                cell.title = `${rowIndex}, ${colIndex}`;

                if (rowIndex === selectedRow && colIndex === selectedCol) {
                    cell.classList.add('selected');
                }

                cell.onclick = () => {
                    this.pi.albumArtRowElement.value = String(rowIndex);
                    this.pi.albumArtColElement.value = String(colIndex);
                    this.saveContextSettings();
                    this.renderPositionPicker();
                };

                this.positionPickerElement.appendChild(cell);
            }
        }
    }

    private saveSettings() {
        const rows = Math.min(5, Math.max(1, parseInt(this.pi.albumArtRowsElement.value) || 2));
        const cols = Math.min(5, Math.max(1, parseInt(this.pi.albumArtColsElement.value) || 2));
        const row = Math.min(rows - 1, Math.max(0, (parseInt(this.pi.albumArtRowElement.value) || 1) - 1));
        const col = Math.min(cols - 1, Math.max(0, (parseInt(this.pi.albumArtColElement.value) || 1) - 1));

        const globalSettings = this.settingsManager.getGlobalSettings<GlobalSettingsInterface>();
        this.settingsManager.setGlobalSettings({...globalSettings, albumArtRows: rows, albumArtCols: cols});
        this.saveContextSettings();
    }

    private saveContextSettings() {
        const rows = Math.min(5, Math.max(1, parseInt(this.pi.albumArtRowsElement.value) || 2));
        const cols = Math.min(5, Math.max(1, parseInt(this.pi.albumArtColsElement.value) || 2));
        const row = Math.min(rows - 1, Math.max(0, (parseInt(this.pi.albumArtRowElement.value) || 1) - 1));
        const col = Math.min(cols - 1, Math.max(0, (parseInt(this.pi.albumArtColElement.value) || 1) - 1));

        this.settingsManager.setContextSettingsAttributes(this.context, {rows, cols, row, col});
    }
}
