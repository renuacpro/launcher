import { AdditionalApp } from '../../database/entity/AdditionalApp';
import { Game } from '../../database/entity/Game';

export namespace ModelUtils {
  export function createGame(): Game {
    return {
      id: '',
      title: '',
      alternateTitles: '',
      series: '',
      developer: '',
      publisher: '',
      platform: '',
      dateAdded: '',
      broken: false,
      extreme: false,
      playMode: '',
      status: '',
      notes: '',
      tags: '',
      source: '',
      applicationPath: '',
      launchCommand: '',
      releaseDate: '',
      version: '',
      originalDescription: '',
      language: '',
      library: '',
      orderTitle: '',
      placeholder: false,
      addApps: []
    };
  }

  export function createAddApp(game: Game): AdditionalApp {
    return {
      id: '',
      parentGame: game,
      applicationPath: '',
      autoRunBefore: false,
      launchCommand: '',
      name: '',
      waitForExit: false,
    };
  }
}