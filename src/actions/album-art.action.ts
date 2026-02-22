import {DidReceiveSettingsEvent, KeyUpEvent, SDOnActionEvent, WillAppearEvent, WillDisappearEvent} from 'streamdeck-typescript';
import {YTMD} from '../ytmd';
import {DefaultAction} from './default.action';
import {StateOutput, TrackState} from "ytmdesktop-ts-companion";
import {AlbumArtSettings} from "../interfaces/context-settings.interface";

export class AlbumArtAction extends DefaultAction<AlbumArtAction> {
    private contexts: { context: string, settings: AlbumArtSettings, currentThumbnail: string, method: (state: StateOutput) => void }[] = [];
    private lastState: StateOutput | null = null;

    constructor(private plugin: YTMD, actionName: string) {
        super(plugin, actionName);
    }

    @SDOnActionEvent('willAppear')
    public onContextAppear(event: WillAppearEvent<AlbumArtSettings>): void {
        let found = this.contexts.find(e => e.context === event.context);
        if (found) {
            found.settings = this.normalizeSettings(event.payload.settings);
            return;
        }

        const settings = this.normalizeSettings(event.payload.settings);
        found = {
            context: event.context,
            settings,
            currentThumbnail: '',
            method: (state: StateOutput) => {
                this.lastState = state;
                this.updateContext(event.context, state).catch(reason => {
                    console.error(reason);
                    this.plugin.logMessage(`Error while updating album art tile. error: ${JSON.stringify(reason)}`);
                    this.plugin.showAlert(event.context);
                });
            }
        };

        this.contexts.push(found);
        this.socket.addStateListener(found.method);
    }

    @SDOnActionEvent('willDisappear')
    public onContextDisappear(event: WillDisappearEvent): void {
        const found = this.contexts.find(e => e.context === event.context);
        if (!found) return;

        this.socket.removeStateListener(found.method);
        this.contexts = this.contexts.filter(e => e.context !== event.context);
    }

    @SDOnActionEvent('didReceiveSettings')
    public onSettingsReceived(event: DidReceiveSettingsEvent<AlbumArtSettings>): void {
        const found = this.contexts.find(e => e.context === event.context);
        if (!found) return;

        found.settings = this.normalizeSettings(event.payload.settings);
        found.currentThumbnail = '';
        if (this.lastState) {
            this.updateContext(event.context, this.lastState).catch(console.error);
        }
    }

    @SDOnActionEvent('keyUp')
    public onKeypressUp(event: KeyUpEvent): void {
        this.rest.playPause().catch(reason => {
            console.error(reason);
            this.plugin.logMessage(`Error while playPause toggle (album art). event: ${JSON.stringify(event)}, error: ${JSON.stringify(reason)}`);
            this.plugin.showAlert(event.context);
        });
    }

    private normalizeSettings(settings: AlbumArtSettings): AlbumArtSettings {
        const rows = Math.max(1, parseInt(String(settings?.rows ?? 1)) || 1);
        const cols = Math.max(1, parseInt(String(settings?.cols ?? 1)) || 1);
        const row = Math.min(rows - 1, Math.max(0, parseInt(String(settings?.row ?? 0)) || 0));
        const col = Math.min(cols - 1, Math.max(0, parseInt(String(settings?.col ?? 0)) || 0));
        return {rows, cols, row, col};
    }

    private async updateContext(context: string, state: StateOutput): Promise<void> {
        const entry = this.contexts.find(e => e.context === context);
        if (!entry) return;

        let coverUrl: string | null = null;
        if (state.player && state.video && state.player.trackState === TrackState.PLAYING) {
            const thumbs = state.video.thumbnails;
            coverUrl = thumbs?.[thumbs.length - 1]?.url ?? null;
        }

        if (!coverUrl) {
            entry.currentThumbnail = '';
            this.plugin.setImage('', context);
            return;
        }

        if (entry.currentThumbnail === coverUrl) return;

        const {rows, cols, row, col} = entry.settings;
        const tileDataUrl = await this.cropTile(coverUrl, rows, cols, row, col);
        entry.currentThumbnail = coverUrl;
        this.plugin.setImage(tileDataUrl, context);
    }

    private cropTile(url: string, rows: number, cols: number, row: number, col: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const tileWidth = img.width / cols;
                const tileHeight = img.height / rows;
                const canvas = document.createElement('canvas');
                canvas.width = 144;
                canvas.height = 144;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('No canvas context'));
                    return;
                }
                ctx.drawImage(img, col * tileWidth, row * tileHeight, tileWidth, tileHeight, 0, 0, 144, 144);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = url;
        });
    }
}
