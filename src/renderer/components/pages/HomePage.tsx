import { Playlist } from '@database/entity/Playlist';
import { ARCADE, THEATRE } from '@shared/constants';
import { wrapSearchTerm } from '@shared/game/GameFilter';
import { LangContainer } from '@shared/lang';
import { getUpgradeString } from '@shared/upgrade/util';
import { formatString } from '@shared/utils/StringFormatter';
import { remote } from 'electron';
import { AppUpdater, UpdateInfo } from 'electron-updater';
import * as path from 'path';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { WithPreferencesProps } from '../../containers/withPreferences';
import { WithSearchProps } from '../../containers/withSearch';
import { newProgress, ProgressContext, ProgressDispatch } from '../../context/ProgressContext';
import { Paths } from '../../Paths';
import { UpgradeStage } from '../../upgrade/types';
import { getPlatformIconURL, joinLibraryRoute } from '../../Util';
import { LangContext } from '../../util/lang';
import { OpenIcon, OpenIconType } from '../OpenIcon';
import { AutoProgressComponent } from '../ProgressComponents';
import { RandomGames } from '../RandomGames';
import { SimpleButton } from '../SimpleButton';
import { SizeProvider } from '../SizeProvider';
import { ViewGame } from '@shared/back/types';
import { HomePageBox } from '../HomePageBox';
import { updatePreferencesData } from '@shared/preferences/util';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {FancyAnimation} from '@renderer/components/FancyAnimation';

type OwnProps = {
  platforms: Record<string, string[]>;
  playlists: Playlist[];
  /** Data and state used for the upgrade system (optional install-able downloads from the HomePage). */
  upgrades: UpgradeStage[];
  onSelectPlaylist: (library: string, playlistId: string | undefined) => void;
  onLaunchGame: (gameId: string) => void;
  /** Clear the current search query (resets the current search filters). */
  clearSearch: () => void;
  /** Called when the "download tech" button is clicked. */
  onDownloadUpgradeClick: (stage: UpgradeStage, strings: LangContainer) => void;
  /** Whether an update is available to the Launcher */
  updateInfo: UpdateInfo | undefined;
  /** Callback to initiate the update */
  autoUpdater: AppUpdater;
  /** Pass to Random Picks */
  randomGames: ViewGame[];
  /** Re-rolls the Random Games */
  rollRandomGames: () => void;
  /** Update to clear platform icon cache */
  logoVersion: number;
  /** Raw HTML of the Update page grabbed */
  updateFeedMarkdown: string;
};

export type HomePageProps = OwnProps & WithPreferencesProps & WithSearchProps;

const updateProgressKey = 'home-page__update-progress';

export function HomePage(props: HomePageProps) {
  const { onDownloadUpgradeClick } = props;

  /** Offset of the starting point in the animated logo's animation (sync it with time of the machine). */
  const logoDelay = React.useMemo(() => (Date.now() * -0.001) + 's', []);

  const allStrings = React.useContext(LangContext);
  const strings = allStrings.home;

  const upgradeStages = props.upgrades;

  /** Whether the Update Available button has been pressed */
  const [updateStarted, setUpdateStarted] = React.useState(false);
  const [progressState, progressDispatch] = React.useContext(ProgressContext.context);

  const toggleMinimizeBox = React.useCallback((cssKey: string) => {
    const newBoxes = [...props.preferencesData.minimizedHomePageBoxes];
    const idx = newBoxes.findIndex(s => s === cssKey);
    if (idx === -1) {
      newBoxes.push(cssKey);
    } else {
      newBoxes.splice(idx, 1);
    }
    updatePreferencesData({
      minimizedHomePageBoxes: newBoxes
    });
  }, [props.preferencesData.minimizedHomePageBoxes]);

  const onLaunchGame = React.useCallback((gameId: string) => {
    props.onLaunchGame(gameId);
  }, [props.onLaunchGame]);

  const onHelpClick = React.useCallback(() => {
    remote.shell.openPath(path.join(window.Shared.config.fullFlashpointPath, 'Manual.pdf'));
  }, [window.Shared.config.fullFlashpointPath]);

  const onHallOfFameClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title === 'Flashpoint Hall of Fame');
    if (playlist) {
      props.onSelectPlaylist(ARCADE, playlist.id);
      props.clearSearch();
    }
  }, [props.playlists, props.onSelectPlaylist, props.clearSearch]);

  const onFavoriteClick = React.useCallback(() => {
    const playlist = props.playlists.find(p => p.title === '*Favorites*');
    if (playlist) {
      props.onSelectPlaylist(ARCADE, playlist.id);
      props.clearSearch();
    }
  }, [props.playlists, props.onSelectPlaylist, props.clearSearch]);

  const onAllGamesClick = React.useCallback(() => {
    props.onSelectPlaylist(ARCADE, undefined);
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const onAllAnimationsClick = React.useCallback(() => {
    props.onSelectPlaylist(THEATRE, undefined);
    props.clearSearch();
  }, [props.onSelectPlaylist, props.clearSearch]);

  const platformList = React.useMemo(() => {
    const libraries = Object.keys(props.platforms);
    const elements: JSX.Element[] = [];
    let key = 0;
    for (let i = 0; i < libraries.length; i++) {
      const library = libraries[i];
      const platforms = props.platforms[library];
      if (platforms.length > 0) {
        // Add a space between library platforms
        if (i !== 0) {
          elements.push(<br key={key++} />);
          elements.push(<br key={key++} />);
        }
        // Add library name above links
        elements.push(<p key={key++}>{allStrings.libraries[library] || library}</p>);
        // Add all libraries from the platform
        elements.push(
          <div
            className='home-page__platform-box'
            key={key++} >
            {platforms.map((platform, j) => (
              <Link
                key={j}
                className='home-page__platform-entry'
                to={joinLibraryRoute(library)}
                onClick={() => {
                  props.onSearch('!' + wrapSearchTerm(platform));
                  props.onSelectPlaylist(library, undefined);
                }}>
                <div
                  className='home-page__platform-entry__logo'
                  style={{ backgroundImage: `url("${getPlatformIconURL(platform, props.logoVersion)}")` }}/>
                <div className='home-page__platform-entry__text'>{platform}</div>
              </Link>
            )
            )}
          </div>
        );
      }
    }
    return elements;
  }, [props.platforms]);

  // (These are kind of "magic numbers" and the CSS styles are designed to fit with them)
  const height = 140;
  const width: number = (height * 0.666) | 0;

  // Render all owned ProgressData as components
  const updateProgressComponent = React.useMemo(() => {
    const progressArray = progressState[updateProgressKey];
    if (progressArray) {
      return progressArray.map((data, index) => (
        <AutoProgressComponent
          key={index}
          progressData={data}
          wrapperClass={'home-page__progress-wrapper'} />
      ));
    }
  }, [progressState[updateProgressKey]]);

  // -- Render the boxes --

  const renderedUpdates = React.useMemo(() => {
    if (window.Shared.installed) {
      return (
        <div className='home-page__box'>
          <div className='home-page__box-head'>{strings.updateHeader}</div>
          <ul className='home-page__box-body home-page__update-box'>
            {strings.currentVersion} - {remote.app.getVersion()}
            <br/>
            { props.updateInfo !== undefined ? (
              <>
                <p>{strings.nextVersion} - {props.updateInfo.version}</p>
                { updateStarted ? undefined : (
                  <SimpleButton
                    value={strings.updateAvailable}
                    onClick={() => {
                      if (props.updateInfo) {
                        const updateNow = onUpdateDownload(props.updateInfo, props.autoUpdater.downloadUpdate);
                        if (updateNow) {
                          const updateProgressState = newProgress(updateProgressKey, progressDispatch);
                          ProgressDispatch.setText(updateProgressState, strings.downloadingUpdate);
                          props.autoUpdater.on('download-progress', (progress) => {
                            ProgressDispatch.setPercentDone(updateProgressState, Math.floor(progress.percent));
                          });
                          props.autoUpdater.once('update-downloaded', (info) => {
                            ProgressDispatch.finished(updateProgressState);
                          });
                          props.autoUpdater.downloadUpdate();
                          setUpdateStarted(true);
                        }
                      }
                    }}>
                  </SimpleButton>
                ) }
                { updateProgressComponent }
              </>
            ) : strings.upToDate }
          </ul>
        </div>
      );
    } else {
      return (
        <></>
      );
    }
  }, [strings, props.autoUpdater, props.updateInfo, updateStarted, setUpdateStarted, updateProgressComponent]);

  const renderedQuickStart = React.useMemo(() => {
    const render = (
      <>
        <QuickStartItem icon='badge'>
          {formatString(strings.hallOfFameInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={onHallOfFameClick}>{strings.hallOfFame}</Link>)}
        </QuickStartItem><QuickStartItem icon='play-circle'>
          {formatString(strings.allGamesInfo, <Link to={joinLibraryRoute(ARCADE)} onClick={onAllGamesClick}>{strings.allGames}</Link>)}
        </QuickStartItem><QuickStartItem icon='video'>
          {formatString(strings.allAnimationsInfo, <Link to={joinLibraryRoute(THEATRE)} onClick={onAllAnimationsClick}>{strings.allAnimations}</Link>)}
        </QuickStartItem><QuickStartItem icon='wrench'>
          {formatString(strings.configInfo, <Link to={Paths.CONFIG}>{strings.config}</Link>)}
        </QuickStartItem>
        <QuickStartItem icon='info'>
          {formatString(strings.helpInfo, <Link to='#' onClick={onHelpClick}>{strings.help}</Link>)}
        </QuickStartItem>
      </>
    );
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('quickStart')}
        cssKey={'quickStart'}
        title={strings.quickStartHeader}
        onToggleMinimize={() => toggleMinimizeBox('quickStart')}>
        {render}
      </HomePageBox>
    );
  }, [strings, onHallOfFameClick, onAllGamesClick, onAllAnimationsClick, onHelpClick, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedExtras = React.useMemo(() => {
    const render = (
      <>
        <QuickStartItem icon='heart'>
          <Link
            to={joinLibraryRoute(ARCADE)}
            onClick={onFavoriteClick}>
            {strings.favoritesPlaylist}
          </Link>
        </QuickStartItem><QuickStartItem icon='list'>
          <div
            onClick={() => remote.shell.openExternal('http://bluemaxima.org/flashpoint/datahub/Tags')}
            className='clickable-url' >
            {strings.tagList}
          </div>
        </QuickStartItem><br /><QuickStartItem icon='puzzle-piece'>
          {strings.filterByPlatform}:
        </QuickStartItem><QuickStartItem className='home-page__box-item--platforms'>
          {platformList}
        </QuickStartItem><br />
        <QuickStartItem icon='code'>
          <div
            onClick={() => remote.shell.openExternal('https://trello.com/b/Tu9E5GLk/launcher')}
            className='clickable-url' >
            {strings.plannedFeatures}
          </div>
        </QuickStartItem>
      </>
    );

    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('extras')}
        cssKey={'extras'}
        title={strings.extrasHeader}
        onToggleMinimize={() => toggleMinimizeBox('extras')}>
        {render}
      </HomePageBox>
    );
  }, [strings, onFavoriteClick, platformList, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedUpgrades = React.useMemo(() => {
    if (upgradeStages.length > 0) {
      const renderedStages: JSX.Element[] = [];
      for (let i = 0; i < upgradeStages.length; i++) {
        renderedStages.push(
          <div key={i * 2}>
            {renderStageSection(allStrings, upgradeStages[i], (stage) => onDownloadUpgradeClick(stage, allStrings))}
          </div>
        );
        renderedStages.push(
          <br key={(i * 2) + 1}/>
        );
      }
      // Remove trailing <br/>
      if (renderedStages.length > 0) { renderedStages.pop(); }
      return (
        <HomePageBox
          minimized={props.preferencesData.minimizedHomePageBoxes.includes('upgrades')}
          cssKey='upgrades'
          title={strings.upgradesHeader}
          onToggleMinimize={() => toggleMinimizeBox('upgrades')}>
          {renderedStages}
        </HomePageBox>
      );
    }
  }, [allStrings, upgradeStages, onDownloadUpgradeClick]);

  const renderedNotes = React.useMemo(() => {
    const render = (
      <QuickStartItem>
        {strings.notes}
      </QuickStartItem>
    );
    return (
      <HomePageBox
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('notes')}
        title={strings.notesHeader}
        cssKey='notes'
        onToggleMinimize={() => toggleMinimizeBox('notes')}>
        {render}
      </HomePageBox>
    );
  }, [strings, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedRandomGames = React.useMemo(() => (
    <SizeProvider width={width} height={height}>
      <RandomGames
        games={props.randomGames}
        rollRandomGames={props.rollRandomGames}
        onLaunchGame={onLaunchGame}
        extremeTags={props.preferencesData.tagFilters.filter(tfg => !tfg.enabled && tfg.extreme).reduce<string[]>((prev, cur) => prev.concat(cur.tags), [])}
        logoVersion={props.logoVersion}
        minimized={props.preferencesData.minimizedHomePageBoxes.includes('random-games')}
        onToggleMinimize={() => toggleMinimizeBox('random-games')} />
    </SizeProvider>
  ), [strings, props.randomGames, onLaunchGame, props.rollRandomGames, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  const renderedUpdateFeed = React.useMemo(() => {
    if (props.updateFeedMarkdown) {
      const markdownRender =
        <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget={'_blank'}>
          {props.updateFeedMarkdown}
        </ReactMarkdown>;
      return (
        <HomePageBox
          minimized={props.preferencesData.minimizedHomePageBoxes.includes('updateFeed')}
          title={strings.updateFeedHeader}
          cssKey='updateFeed'
          onToggleMinimize={() => toggleMinimizeBox('updateFeed')}>
          {markdownRender}
        </HomePageBox>
      );
    }
  }, [strings, props.updateFeedMarkdown, props.preferencesData.minimizedHomePageBoxes, toggleMinimizeBox]);

  // Render
  return React.useMemo(() => (
    <div className='home-page simple-scroll'>
      <div className='home-page__inner'>
        {/* Logo */}
        <div className='home-page__logo fp-logo-box'>
          <FancyAnimation
            fancyRender={() => (
              <div
                className='fp-logo fp-logo--animated'
                style={{ animationDelay: logoDelay }} />
            )}
            normalRender={() => (
              <div className='fp-logo'/>
            )}/>
        </div>
        {/* Update Feed */}
        { renderedUpdateFeed }
        {/* Updates */}
        { renderedUpdates }
        {/* Quick Start */}
        { renderedQuickStart }
        {/* Notes */}
        { renderedNotes }
        {/* Upgrades */}
        { renderedUpgrades }
        {/* Random Games */}
        { renderedRandomGames }
        {/* Extras */}
        { renderedExtras }
      </div>
    </div>
  ), [renderedUpdates, renderedQuickStart, renderedUpgrades, renderedExtras, renderedNotes, renderedRandomGames, renderedUpdateFeed]);
}

function QuickStartItem(props: { icon?: OpenIconType, className?: string, children?: React.ReactNode }): JSX.Element {
  return (
    <li className={'home-page__box-item simple-center ' + (props.className||'')}>
      { props.icon ? (
        <div className='home-page__box-item-icon'>
          <OpenIcon icon={props.icon} />
        </div>
      ) : undefined }
      <div className='simple-center__vertical-inner'>
        {props.children}
      </div>
    </li>
  );
}

function renderStageSection(strings: LangContainer, stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  return (
    <>
      <QuickStartItem><b>{getUpgradeString(stage.title, strings.upgrades)}</b></QuickStartItem>
      <QuickStartItem><i>{getUpgradeString(stage.description, strings.upgrades)}</i></QuickStartItem>
      <QuickStartItem>{ renderStageButton(strings.home, stage, onDownload) }</QuickStartItem>
    </>
  );
}

function renderStageButton(strings: LangContainer['home'], stage: UpgradeStage, onDownload: (stage: UpgradeStage) => void) {
  const stageState = stage.state;
  return (
    stageState.checksDone ? (
      stageState.alreadyInstalled && stageState.upToDate ? (
        <p className='home-page__grayed-out'>{strings.alreadyInstalled}</p>
      ) : (
        stageState.isInstallationComplete ? (
          strings.installComplete
        ) : (
          stageState.isInstalling ? (
            <p>{stageState.installProgressNote}</p>
          ) : (
            <a
              className='simple-button'
              onClick={() => { onDownload(stage); }}>
              {stageState.alreadyInstalled ? strings.update : strings.download}
            </a>
          )
        )
      )
    ) : strings.checkingUpgradeState
  );
}

function onUpdateDownload(updateInfo: UpdateInfo, downloadFunc: () => void): boolean {
  const message = (updateInfo.releaseName ? `${updateInfo.releaseName}\n\n` : '')
              + (updateInfo.releaseNotes ? `Release Notes:\n${updateInfo.releaseNotes}\n\n` : 'No Release Notes Available.\n\n')
              + 'Download and Install now?';
  const res = remote.dialog.showMessageBoxSync({
    title: 'Update Available',
    message: message,
    buttons: ['Yes', 'No']
  });
  if (res === 0) {
    return true;
  }
  return false;
}
