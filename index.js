/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var locationSelectElement = document.querySelector('#locationSelect');
  var floorSelectElement = document.querySelector('#floorSelect');
  var pieceSelectElement = document.querySelector('#pieceSelect');
  var floorFieldElement = document.querySelector('#floorField');
  var pieceFieldElement = document.querySelector('#pieceField');
  var locationDropdownElement = document.querySelector('.tour-dropdown[data-dropdown="location"]');
  var floorDropdownElement = document.querySelector('.tour-dropdown[data-dropdown="floor"]');
  var pieceDropdownElement = document.querySelector('.tour-dropdown[data-dropdown="piece"]');
  var mapToggleElement = document.querySelector('#mapToggle');
  var mapPanelElement = document.querySelector('#tourMapPanel');
  var gyroToggleElement = document.querySelector('#gyroToggle');
  var mapElement = document.querySelector('#tourMap');
  var mapImageElement = document.querySelector('#mapImage');
  var mapMarkersElement = document.querySelector('#mapMarkers');
  var mapEmptyStateElement = document.querySelector('#mapEmptyState');
  var mapContextLabelElement = document.querySelector('#mapContextLabel');
  data.settings.autorotateEnabled = true;
  var ENABLE_TOUR_NAVIGATION = true;
  var currentScene = null;
  var gyroEnabled = false;
  var dropdownRegistry = {
    location: buildDropdownConfig(locationDropdownElement, locationSelectElement, 'Ubicación'),
    floor: buildDropdownConfig(floorDropdownElement, floorSelectElement, 'Planta'),
    piece: buildDropdownConfig(pieceDropdownElement, pieceSelectElement, 'Pieza')
  };
  

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  ensurePieceOneLinkHotspots(data.scenes);
  adjustPieceOneInitialView(data.scenes);
  ensurePieceTwoRightLinkHotspot(data.scenes);
  ensurePieceTwoLeftMirrorHotspot(data.scenes);
  ensurePieceTwoFourthLinkHotspot(data.scenes);
  ensurePieceTwoFifthLinkHotspot(data.scenes);
  ensurePieceTwoSixthLinkHotspot(data.scenes);
  ensurePieceThreeRightLinkHotspot(data.scenes);
  ensurePieceThreeLeftLinkHotspot(data.scenes);
  ensurePieceThreeFourthLinkHotspot(data.scenes);
  ensurePieceThreeSecondLinkHotspot(data.scenes);
  ensurePieceThreeSixthLinkHotspot(data.scenes);
  ensurePieceFourRightLinkHotspot(data.scenes);
  ensurePieceFourSecondLinkHotspot(data.scenes);
  ensurePieceFourFirstLinkHotspot(data.scenes);
  ensurePieceFourFifthLinkHotspot(data.scenes);
  ensurePieceFourSixthLinkHotspot(data.scenes);
  ensurePieceFiveRightLinkHotspot(data.scenes);
  ensurePieceFiveThirdLinkHotspot(data.scenes);
  ensurePieceFiveSecondLinkHotspot(data.scenes);
  ensurePieceFiveFirstLinkHotspot(data.scenes);
  ensurePieceFiveSixthLinkHotspot(data.scenes);
  ensurePieceSixFirstLinkHotspot(data.scenes);
  ensurePieceSixSecondLinkHotspot(data.scenes);
  ensurePieceSixThirdLinkHotspot(data.scenes);
  ensurePieceSixFourthLinkHotspot(data.scenes);
  ensurePieceSixFifthLinkHotspot(data.scenes);

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
  window.viewer = viewer;
  viewer.addEventListener('parameterDynamics', function(event) {
    if (!currentScene) {
      return;
    }

    var parameters = {};
    parameters[event.parameter] = event.dynamics.absolute();
    currentScene.view.setParameters(parameters);
  });
  var deviceOrientationControlMethod = new DeviceOrientationControlMethod();

  // Create scenes.
  var scenes = data.scenes.map(function(sceneData) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + sceneData.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + sceneData.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    sceneData.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    sceneData.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: sceneData,
      scene: scene,
      view: view
    };
  });

  var tourData = createDefaultTourData(data.scenes);
  var state = {
    locationId: '',
    floorId: '',
    pieceId: '',
    selectedSceneId: '',
    visitedPieceIds: {}
  };

  window.TOUR_DATA = tourData;

  mapImageElement.addEventListener('error', function() {
    if (mapImageElement.dataset.fallback) {
      mapImageElement.src = mapImageElement.dataset.fallback;
      mapImageElement.dataset.fallback = '';
    }
  });

  // Connect the floating map button to the map panel in the redesigned UI.
  mapToggleElement.addEventListener('click', function() {
    var shouldHidePanel = !mapPanelElement.classList.contains('is-hidden');
    mapPanelElement.classList.toggle('is-hidden', shouldHidePanel);
    mapToggleElement.classList.toggle('is-active', !shouldHidePanel);
    mapToggleElement.setAttribute('aria-expanded', shouldHidePanel ? 'false' : 'true');
  });

  // Keep the gyroscope button ready as a floating utility control.
  if (gyroToggleElement) {
    gyroToggleElement.addEventListener('click', function(event) {
      event.preventDefault();
      toggleDeviceOrientation();
    });
  }

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(sceneRecord) {
    var el = document.querySelector('#sceneList .scene[data-id="' + sceneRecord.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(sceneRecord);
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('deviceOrientation', deviceOrientationControlMethod);
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  initSelectors();
  initializeDefaultSelection();
  if (!currentScene && scenes.length) {
    currentScene = scenes[0];
    deviceOrientationControlMethod.setCurrentScene(scenes[0]);
  }

  function sanitize(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function createDefaultTourData(sceneDataList) {
    // Mapeo explícito pieza -> escena usando los ids reales exportados por Marzipano.
    // Las 17 escenas actuales corresponden al Edificio B.
    var edificioBSceneIds = {
      planta1: [
        sceneDataList[0] && sceneDataList[0].id,
        sceneDataList[1] && sceneDataList[1].id,
        sceneDataList[2] && sceneDataList[2].id,
        sceneDataList[3] && sceneDataList[3].id,
        sceneDataList[4] && sceneDataList[4].id,
        sceneDataList[5] && sceneDataList[5].id
      ],
      planta0: [
        sceneDataList[6] && sceneDataList[6].id,
        sceneDataList[7] && sceneDataList[7].id,
        sceneDataList[8] && sceneDataList[8].id,
        sceneDataList[9] && sceneDataList[9].id,
        sceneDataList[10] && sceneDataList[10].id,
        sceneDataList[11] && sceneDataList[11].id,
        sceneDataList[12] && sceneDataList[12].id,
        sceneDataList[13] && sceneDataList[13].id,
        sceneDataList[14] && sceneDataList[14].id,
        sceneDataList[15] && sceneDataList[15].id,
        sceneDataList[16] && sceneDataList[16].id
      ]
    };

    return {
      locations: [
        {
          id: 'edificio-b',
          name: 'Edificio B',
          hasFloors: true,
          floors: [
            {
              id: 'planta-0',
              name: 'Planta 0',
              map: {
                id: 'edificio-b-planta-0',
                label: 'Edificio B · Planta 0',
                image: 'img/EDIFICIOB/edificioBPlanta2.png'
              },
              pieces: buildPieces('edificio-b', 'planta-0', edificioBSceneIds.planta0, [
                [69, 52],
                [69, 62],
                [59, 71],
                [35, 71],
                [17, 62],
                [17, 54],
                [17, 45],
                [35, 32],
                [59, 32],
                [69, 45],
                [47, 53]
              ])
            },
            {
              id: 'planta-1',
              name: 'Planta 1',
              map: {
                id: 'edificio-b-planta-1',
                label: 'Edificio B · Planta 1',
                image: 'img/EDIFICIOB/edificioBPlanta1.png'
              },
              pieces: buildPieces('edificio-b', 'planta-1', edificioBSceneIds.planta1, [
                [64, 28],
                [31, 28],
                [14, 43],
                [14, 54],
                [14, 66],
                [48, 81]
              ])
            }
          ]
        }
      ]
    };
  }

  function buildPieces(locationId, floorId, sceneIds, coordinates) {
    return sceneIds.filter(Boolean).map(function(sceneId, index) {
      var sceneData = findSceneDataById(sceneId);
      var markerCoords = coordinates[index] || [50, 50];
      var pieceNumber = getSceneDisplayNumber(sceneData);
      var shortPieceLabel = buildShortPieceLabel(sceneData, pieceNumber);
      return {
        id: [locationId, floorId || 'sin-planta', index + 1].join('-'),
        name: shortPieceLabel,
        menuLabel: shortPieceLabel,
        pieceNumber: pieceNumber,
        sceneName: sceneData ? sceneData.name : 'Pieza ' + (index + 1),
        sceneId: sceneId,
        locationId: locationId,
        floorId: floorId || '',
        hotspotId: sceneId,
        mapX: markerCoords[0],
        mapY: markerCoords[1],
        viewParameters: sceneData ? sceneData.initialViewParameters : null
      };
    });
  }

  function getSceneDisplayNumber(sceneData) {
    if (!sceneData || !sceneData.name) {
      return 0;
    }

    var match = sceneData.name.match(/^\s*(\d+)\./);
    return match ? parseInt(match[1], 10) : 0;
  }

  function buildShortPieceLabel(sceneData, pieceNumber) {
    var pieceLabels = {
      1: 'Lauda sepulcral',
      2: 'Discípulos',
      3: 'La duda',
      4: 'Puerta Capilla',
      5: 'Ascensión',
      6: 'Incredulidad',
      7: 'La esclava',
      8: 'Leonor Aragón',
      9: 'Pío VI',
      10: 'Romana Tulia',
      11: 'Goya',
      12: 'Mercurio',
      13: 'Giuliano',
      14: 'Augusto',
      15: 'Miguel Ángel',
      16: 'Faustina',
      17: 'Flautista'
    };

    if (!pieceNumber || !pieceLabels[pieceNumber]) {
      return pieceNumber + '. Pieza';
    }

    return pieceNumber + '. ' + pieceLabels[pieceNumber];
  }

  function initSelectors() {
    initCustomDropdowns();
    populateLocationOptions();
    resetDependentSelectors('location');
    updateMap();

    locationSelectElement.addEventListener('change', function(event) {
      handleLocationChange(event.target.value);
    });

    floorSelectElement.addEventListener('change', function(event) {
      handleFloorChange(event.target.value);
    });

    pieceSelectElement.addEventListener('change', function(event) {
      handlePieceChange(event.target.value);
    });
  }

  function initializeDefaultSelection() {
    var defaultLocationId = 'edificio-b';
    var defaultFloorId = 'planta-0';
    var defaultPiece = findPieceByNumber(17);

    state.locationId = defaultLocationId;
    state.floorId = defaultFloorId;
    state.pieceId = defaultPiece ? defaultPiece.id : '';

    populateLocationOptions();
    updateFloorOptions();
    updatePieceOptions();
    updateMap();

    if (floorSelectElement) {
      floorSelectElement.value = defaultFloorId;
    }

    if (pieceSelectElement && state.pieceId) {
      pieceSelectElement.value = state.pieceId;
    }

    if (defaultPiece && ENABLE_TOUR_NAVIGATION) {
      goToPiece(defaultPiece.id);
    }
  }

  function populateLocationOptions() {
    var locationOptions = tourData.locations.map(function(location) {
      return { value: location.id, label: location.name, buttonLabel: location.name };
    });

    setSelectOptions(locationSelectElement, locationOptions, 'Selecciona una ubicación', state.locationId);
    renderCustomDropdown(dropdownRegistry.location, locationOptions, 'Ubicación', state.locationId, false);
  }

  function updateFloorOptions() {
    var location = getLocationById(state.locationId);
    var shouldShowFloor = location && location.hasFloors;

    floorFieldElement.classList.toggle('is-hidden', !shouldShowFloor);
    floorFieldElement.classList.toggle('is-disabled', !shouldShowFloor);

    if (!shouldShowFloor) {
      setSelectOptions(floorSelectElement, [], 'Sin plantas', '');
      floorSelectElement.disabled = true;
      renderCustomDropdown(dropdownRegistry.floor, [], 'Planta', '', true);
      closeDropdown(dropdownRegistry.floor);
      return;
    }

    var floorOptions = location.floors.map(function(floor) {
      return { value: floor.id, label: floor.name, buttonLabel: floor.name };
    });

    setSelectOptions(floorSelectElement, floorOptions, 'Selecciona una planta', state.floorId);
    floorSelectElement.disabled = false;
    floorFieldElement.classList.remove('is-disabled');
    renderCustomDropdown(dropdownRegistry.floor, floorOptions, 'Planta', state.floorId, false);
  }

  function updatePieceOptions() {
    var pieces = getPiecesForCurrentSelection();
    var placeholder = 'Selecciona una pieza';
    var canSelectPiece = false;

    if (!state.locationId) {
      placeholder = 'Selecciona una ubicación';
    } else if (requiresFloorSelection() && !state.floorId) {
      placeholder = 'Selecciona una planta';
    } else {
      canSelectPiece = pieces.length > 0;
    }

    setSelectOptions(pieceSelectElement, pieces.map(function(piece) {
      return { value: piece.id, label: piece.menuLabel || piece.name, buttonLabel: piece.name };
    }), placeholder, state.pieceId);

    pieceSelectElement.disabled = !canSelectPiece;
    pieceFieldElement.classList.toggle('is-disabled', !canSelectPiece);
    renderCustomDropdown(dropdownRegistry.piece, pieces.map(function(piece) {
      return { value: piece.id, label: piece.menuLabel || piece.name, buttonLabel: piece.name };
    }), 'Pieza', state.pieceId, !canSelectPiece);
  }

  function updateMap() {
    var location = getLocationById(state.locationId);
    var floor = getSelectedFloor();
    var pieces = getPiecesForCurrentSelection();
    var mapData = getSelectedMap();
    var hasRenderableMap = !!mapData;

    mapMarkersElement.innerHTML = '';
    mapElement.classList.toggle('has-image', hasRenderableMap);

    if (!location) {
      if (mapContextLabelElement) {
        mapContextLabelElement.textContent = 'Sin selección';
      }
      mapImageElement.removeAttribute('src');
      mapEmptyStateElement.textContent = 'Selecciona una ubicación para cargar el mapa.';
      return;
    }

    if (location.hasFloors && !floor) {
      if (mapContextLabelElement) {
        mapContextLabelElement.textContent = location.name;
      }
      mapImageElement.dataset.fallback = '';
      mapImageElement.src = createMapPlaceholderDataUri(location.name);
      mapEmptyStateElement.textContent = 'Selecciona una planta para mostrar el mapa y sus marcadores.';
      return;
    }

    if (mapContextLabelElement) {
      mapContextLabelElement.textContent = floor ? location.name + ' · ' + floor.name : location.name;
    }
    setMapImageSource(mapData);
    mapEmptyStateElement.textContent = pieces.length ? '' : 'No hay piezas configuradas para esta selección.';

    renderMapMarkers(pieces);
  }

  function renderMapMarkers(pieces) {
    pieces.forEach(function(piece) {
      var markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = 'tour-map-marker';
      markerElement.setAttribute('data-label', String(piece.pieceNumber || ''));
      markerElement.setAttribute('title', piece.name);
      markerElement.style.left = piece.mapX + '%';
      markerElement.style.top = piece.mapY + '%';

      if (state.visitedPieceIds[piece.id]) {
        markerElement.classList.add('is-visited');
      }

      if (piece.id === state.pieceId || piece.sceneId === state.selectedSceneId) {
        markerElement.classList.add('is-selected');
      }

      if (!piece.sceneId) {
        markerElement.classList.add('is-unavailable');
        markerElement.disabled = true;
      } else {
        markerElement.addEventListener('click', function() {
          state.pieceId = piece.id;
          pieceSelectElement.value = piece.id;
          goToPiece(piece.id);
        });
      }

      mapMarkersElement.appendChild(markerElement);
    });
  }

  function goToPiece(pieceId) {
    var piece = findPieceById(pieceId);
    if (!piece || !piece.sceneId) {
      return;
    }

    var scene = findSceneById(piece.sceneId);
    if (!scene) {
      return;
    }

    state.locationId = piece.locationId;
    state.floorId = piece.floorId || '';
    state.pieceId = piece.id;

    switchScene(scene, {
      selectedPieceId: piece.id,
      viewParameters: piece.viewParameters
    });
  }

  function markAsVisited(pieceId) {
    if (!pieceId) {
      return;
    }

    state.visitedPieceIds[pieceId] = true;
  }

  function resetDependentSelectors(level) {
    if (level === 'location') {
      setSelectOptions(floorSelectElement, [], 'Selecciona una planta', '');
      floorSelectElement.disabled = true;
      floorFieldElement.classList.add('is-disabled');
      renderCustomDropdown(dropdownRegistry.floor, [], 'Planta', '', true);
      closeDropdown(dropdownRegistry.floor);
    }

    setSelectOptions(pieceSelectElement, [], level === 'location' ? 'Selecciona una ubicación' : 'Selecciona una planta', '');
    pieceSelectElement.disabled = true;
    pieceFieldElement.classList.add('is-disabled');
    renderCustomDropdown(dropdownRegistry.piece, [], 'Pieza', '', true);
    closeDropdown(dropdownRegistry.piece);
  }

  function switchScene(sceneRecord, options) {
    options = options || {};

    stopAutorotate();
    sceneRecord.view.setParameters(options.viewParameters || sceneRecord.data.initialViewParameters);
    sceneRecord.scene.switchTo();
    startAutorotate();
    updateSceneName(sceneRecord);
    updateSceneList(sceneRecord);
    document.body.setAttribute('data-scene-id', sceneRecord.data.id);
    currentScene = sceneRecord;
    deviceOrientationControlMethod.setCurrentScene(sceneRecord);

    state.selectedSceneId = sceneRecord.data.id;

    if (!options.skipTourSync) {
      if (ENABLE_TOUR_NAVIGATION) {
        syncTourSelectionWithScene(sceneRecord.data.id, options.selectedPieceId || null);
      }
    }

    if (!options.skipVisited) {
      if (ENABLE_TOUR_NAVIGATION) {
        markVisitedBySceneId(sceneRecord.data.id, options.selectedPieceId || null);
      }
    }
  }

  function syncTourSelectionWithScene(sceneId, preferredPieceId) {
    var piece = preferredPieceId ? findPieceById(preferredPieceId) : findPieceBySceneId(sceneId);
    if (!piece) {
      updateMap();
      return;
    }

    state.locationId = piece.locationId;
    state.floorId = piece.floorId || '';
    state.pieceId = piece.id;

    populateLocationOptions();
    updateFloorOptions();
    updatePieceOptions();

    locationSelectElement.value = state.locationId;
    floorSelectElement.value = state.floorId;
    pieceSelectElement.value = state.pieceId;

    updateMap();
  }

  function markVisitedBySceneId(sceneId, preferredPieceId) {
    var piece = preferredPieceId ? findPieceById(preferredPieceId) : findPieceBySceneId(sceneId);
    if (!piece) {
      return;
    }

    markAsVisited(piece.id);
    updateMap();
  }

  function updateSceneName(sceneRecord) {
    sceneNameElement.innerHTML = sanitize(sceneRecord.data.name);
  }

  function updateSceneList(sceneRecord) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === sceneRecord.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function setGyroToggleState(enabled) {
    if (!gyroToggleElement) {
      return;
    }

    gyroToggleElement.classList.toggle('enabled', enabled);
    gyroToggleElement.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  function isGyroBlockedByContext() {
    return !!(window.DeviceOrientationEvent && !window.isSecureContext);
  }

  function notifyGyroUnavailable(message) {
    window.alert(message);
    console.warn(message);
  }

  function enableDeviceOrientation() {
    function activateGyro() {
      if (!currentScene && scenes.length) {
        currentScene = scenes[0];
      }
      if (currentScene) {
        deviceOrientationControlMethod.setCurrentScene(currentScene);
      }

      deviceOrientationControlMethod.enable();
      controls.enableMethod('deviceOrientation');
      deviceOrientationControlMethod.getPitch(function(err, pitch) {
        if (!err && currentScene) {
          currentScene.view.setPitch(pitch);
        }
      });

      gyroEnabled = true;
      setGyroToggleState(true);
    }

    if (!window.DeviceOrientationEvent) {
      notifyGyroUnavailable('Este dispositivo o navegador no admite control por giroscopio.');
      return;
    }

    if (isGyroBlockedByContext()) {
      notifyGyroUnavailable('El giroscopio necesita abrir el tour en HTTPS o en localhost para funcionar en este móvil.');
      return;
    }

    if (window.DeviceOrientationEvent &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      window.DeviceOrientationEvent.requestPermission()
        .then(function(response) {
          if (response === 'granted') {
            activateGyro();
          }
        })
        .catch(function(error) {
          console.error(error);
        });
      return;
    }

    activateGyro();
  }

  function disableDeviceOrientation() {
    deviceOrientationControlMethod.disable();
    controls.disableMethod('deviceOrientation');
    gyroEnabled = false;
    setGyroToggleState(false);
  }

  function toggleDeviceOrientation() {
    if (gyroEnabled) {
      disableDeviceOrientation();
    } else {
      enableDeviceOrientation();
    }
  }

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    stopTouchAndScrollEventPropagation(wrapper);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var hotspotContent = parseInfoHotspotContent(hotspot);
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');
    if (isLongInfoHotspotTitle(hotspotContent.title)) {
      wrapper.classList.add('info-hotspot-long-title');
    }

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.textContent = hotspotContent.title;
    titleWrapper.appendChild(title);

    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    var textScroll = document.createElement('div');
    textScroll.classList.add('info-hotspot-text-scroll');
    textScroll.appendChild(createInfoHotspotContentElement(hotspotContent));
    text.appendChild(textScroll);

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var close = function() {
      wrapper.classList.remove('is-hovered');
      wrapper.classList.remove('visible');
      modal.classList.remove('visible');
    };
    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    header.addEventListener('mouseenter', function() {
      if (!wrapper.classList.contains('visible') && document.body.classList.contains('no-touch')) {
        wrapper.classList.add('is-hovered');
      }
    });

    header.addEventListener('mouseleave', function() {
      wrapper.classList.remove('is-hovered');
    });

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    wrapper.querySelector('.info-hotspot-close-wrapper').addEventListener('click', function(event) {
      event.stopPropagation();
      close();
    });
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', close);

    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function isLongInfoHotspotTitle(title) {
    return String(title || '').trim().length >= 24;
  }

  function parseInfoHotspotContent(hotspot) {
    var labels = [
      'Autor',
      'Fecha',
      'Estilo',
      'Material original',
      'Descripción',
      'Contexto artístico',
      'Ubicación original',
      'Ubicación del vaciado',
      'Ubicación del vacado'
    ];
    var title = stripHotspotHtml(hotspot.title);
    var normalized = normalizeHotspotText(hotspot.text);
    var fields = {};
    var allLabelsPattern = labels.map(function(nextLabel) {
      return escapeRegExp(nextLabel) + '\\s*:';
    }).join('|');

    labels.forEach(function(label) {
      var escapedLabel = escapeRegExp(label);
      var regex = new RegExp(escapedLabel + '\\s*:\\s*([\\s\\S]*?)' + (allLabelsPattern ? '(?=' + allLabelsPattern + '|$)' : '$'), 'i');
      var match = normalized.match(regex);
      if (match) {
        fields[label] = cleanFieldValue(match[1]);
      }
    });

    return {
      title: title,
      fields: fields
    };
  }

  function createInfoHotspotContentElement(content) {
    var container = document.createElement('div');
    container.classList.add('info-hotspot-content');

    [
      'Autor',
      'Fecha',
      'Estilo',
      'Material original',
      'Ubicación original',
      'Ubicación del vaciado',
      'Ubicación del vacado'
    ].forEach(function(label) {
      if (!content.fields[label]) {
        return;
      }

      var row = document.createElement('div');
      row.classList.add('info-hotspot-row');

      var rowLabel = document.createElement('span');
      rowLabel.classList.add('info-hotspot-row-label');
      rowLabel.textContent = label + ':';

      var rowValue = document.createElement('span');
      rowValue.classList.add('info-hotspot-row-value');
      rowValue.textContent = content.fields[label];

      row.appendChild(rowLabel);
      row.appendChild(rowValue);
      container.appendChild(row);
    });

    [
      'Descripción',
      'Contexto artístico'
    ].forEach(function(label) {
      if (!content.fields[label]) {
        return;
      }

      var section = document.createElement('section');
      section.classList.add('info-hotspot-section');

      var heading = document.createElement('h4');
      heading.classList.add('info-hotspot-section-title');
      heading.textContent = label + ':';

      var paragraph = document.createElement('p');
      paragraph.classList.add('info-hotspot-section-body');
      paragraph.textContent = content.fields[label];

      section.appendChild(heading);
      section.appendChild(paragraph);
      container.appendChild(section);
    });

    return container;
  }

  function normalizeHotspotText(html) {
    var normalizedHtml = String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n');
    var container = document.createElement('div');
    container.innerHTML = normalizedHtml;
    return cleanFieldValue(container.textContent || '');
  }

  function stripHotspotHtml(html) {
    var container = document.createElement('div');
    container.innerHTML = html || '';
    return cleanFieldValue(container.textContent || '');
  }

  function cleanFieldValue(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stopTouchAndScrollEventPropagation(element) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function setSelectOptions(selectElement, options, placeholder, selectedValue) {
    selectElement.innerHTML = '';

    var placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);

    options.forEach(function(option) {
      var optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      selectElement.appendChild(optionElement);
    });

    selectElement.value = selectedValue || '';
  }

  function buildDropdownConfig(dropdownElement, selectElement, placeholder) {
    return {
      root: dropdownElement,
      select: selectElement,
      placeholder: placeholder,
      button: dropdownElement.querySelector('.tour-dropdown-button'),
      value: dropdownElement.querySelector('.tour-dropdown-value'),
      menu: dropdownElement.querySelector('.tour-dropdown-menu')
    };
  }

  function initCustomDropdowns() {
    Object.keys(dropdownRegistry).forEach(function(key) {
      var config = dropdownRegistry[key];

      config.button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (config.select.disabled) {
          return;
        }

        toggleDropdown(config);
      });

      config.menu.addEventListener('click', function(event) {
        var optionButton = event.target.closest('.tour-dropdown-option');
        if (!optionButton) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        setDropdownValue(config, optionButton.dataset.value);
        closeAllDropdowns();
      });
    });

    document.addEventListener('click', function(event) {
      if (!event.target.closest('.tour-field')) {
        closeAllDropdowns();
      }
    });
  }

  function renderCustomDropdown(config, options, fallbackLabel, selectedValue, disabled) {
    var label = fallbackLabel || config.placeholder;
    var currentOption = null;

    config.menu.innerHTML = '';

    options.forEach(function(option) {
      var optionElement = document.createElement('button');
      optionElement.type = 'button';
      optionElement.className = 'tour-dropdown-option';
      optionElement.dataset.value = option.value;
      optionElement.textContent = option.label;

      if (option.value === selectedValue) {
        currentOption = option;
      }

      config.menu.appendChild(optionElement);
    });

    config.value.textContent = currentOption ? (currentOption.buttonLabel || currentOption.label) : label;
    config.button.disabled = !!disabled;
    config.root.classList.toggle('is-disabled', !!disabled);
    config.root.classList.toggle('is-selected', !!selectedValue);
  }

  function toggleDropdown(config) {
    var shouldOpen = !config.root.classList.contains('is-open');
    closeAllDropdowns();

    if (shouldOpen) {
      openDropdown(config);
    }
  }

  function openDropdown(config) {
    if (config.select.disabled || !config.menu.children.length) {
      return;
    }

    config.root.classList.add('is-open');
  }

  function closeDropdown(config) {
    if (!config) {
      return;
    }

    config.root.classList.remove('is-open');
  }

  function closeAllDropdowns() {
    Object.keys(dropdownRegistry).forEach(function(key) {
      closeDropdown(dropdownRegistry[key]);
    });
  }

  function setDropdownValue(config, value) {
    config.select.value = value;
    config.select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function handleLocationChange(value) {
    state.locationId = value;
    state.floorId = value === 'edificio-b' ? 'planta-0' : '';
    state.pieceId = '';
    populateLocationOptions();
    updateFloorOptions();
    if (state.floorId) {
      floorSelectElement.value = state.floorId;
    } else {
      resetDependentSelectors('location');
    }
    updatePieceOptions();
    updateMap();
    closeAllDropdowns();
  }

  function handleFloorChange(value) {
    state.floorId = value;
    state.pieceId = '';
    updateFloorOptions();
    resetDependentSelectors('floor');
    updatePieceOptions();
    closeAllDropdowns();

    var defaultPiece = getDefaultPieceForSelectedFloor();
    if (defaultPiece && ENABLE_TOUR_NAVIGATION) {
      state.pieceId = defaultPiece.id;
      pieceSelectElement.value = defaultPiece.id;
      updatePieceOptions();
      updateMap();
      goToPiece(defaultPiece.id);
      return;
    }

    updateMap();
  }

  function handlePieceChange(value) {
    state.pieceId = value;
    updatePieceOptions();
    updateMap();
    closeAllDropdowns();

    if (state.pieceId) {
      if (ENABLE_TOUR_NAVIGATION) {
        goToPiece(state.pieceId);
      }
    }
  }

  function requiresFloorSelection() {
    var location = getLocationById(state.locationId);
    return !!(location && location.hasFloors);
  }

  function getLocationById(locationId) {
    if (!locationId) {
      return null;
    }

    for (var i = 0; i < tourData.locations.length; i++) {
      if (tourData.locations[i].id === locationId) {
        return tourData.locations[i];
      }
    }
    return null;
  }

  function getSelectedFloor() {
    var location = getLocationById(state.locationId);
    if (!location || !location.hasFloors) {
      return null;
    }

    for (var i = 0; i < location.floors.length; i++) {
      if (location.floors[i].id === state.floorId) {
        return location.floors[i];
      }
    }
    return null;
  }

  function getPiecesForCurrentSelection() {
    var location = getLocationById(state.locationId);
    if (!location) {
      return [];
    }

    if (!location.hasFloors) {
      return location.pieces || [];
    }

    var floor = getSelectedFloor();
    return floor ? floor.pieces : [];
  }

  function getSelectedMap() {
    var location = getLocationById(state.locationId);
    if (!location) {
      return null;
    }

    if (!location.hasFloors) {
      return location.map;
    }

    var floor = getSelectedFloor();
    return floor ? floor.map : null;
  }

  function getDefaultPieceForSelectedFloor() {
    var pieces = getPiecesForCurrentSelection();
    return pieces.length ? pieces[0] : null;
  }

  function findPieceById(pieceId) {
    var pieces = getAllPieces();
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].id === pieceId) {
        return pieces[i];
      }
    }
    return null;
  }

  function findPieceBySceneId(sceneId) {
    var pieces = getAllPieces();
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].sceneId === sceneId) {
        return pieces[i];
      }
    }
    return null;
  }

  function findPieceByNumber(pieceNumber) {
    var pieces = getAllPieces();
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].pieceNumber === pieceNumber) {
        return pieces[i];
      }
    }
    return null;
  }

  function getAllPieces() {
    var allPieces = [];

    tourData.locations.forEach(function(location) {
      if (location.hasFloors) {
        location.floors.forEach(function(floor) {
          allPieces = allPieces.concat(floor.pieces);
        });
      } else {
        allPieces = allPieces.concat(location.pieces);
      }
    });

    return allPieces;
  }

  function ensurePieceOneLinkHotspots(sceneDataList) {
    var scene01 = null;
    var i;

    for (i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
        scene01 = sceneDataList[i];
        break;
      }
    }

    if (!scene01 || !scene01.linkHotspots || !scene01.linkHotspots.length) {
      return;
    }

    var hotspotToPiece02 = null;
    var hotspotToPiece03 = null;
    var hotspotToPiece04 = null;
    var hotspotToPiece05 = null;
    var alreadyHasPiece03 = false;
    var alreadyHasPiece04 = false;
    var alreadyHasPiece05 = false;
    var alreadyHasPiece06 = false;

    for (i = 0; i < scene01.linkHotspots.length; i++) {
      if (scene01.linkHotspots[i].target === '1-02-los-discpulos-de-emas') {
        hotspotToPiece02 = scene01.linkHotspots[i];
      }
      if (scene01.linkHotspots[i].target === '2-03-la-duda-de-santo-toms') {
        hotspotToPiece03 = scene01.linkHotspots[i];
        alreadyHasPiece03 = true;
      }
      if (scene01.linkHotspots[i].target === '3-04-puerta-de-la-capilla-del-sagrario') {
        hotspotToPiece04 = scene01.linkHotspots[i];
        alreadyHasPiece04 = true;
      }
      if (scene01.linkHotspots[i].target === '4-05-la-ascensin-de-cristo') {
        hotspotToPiece05 = scene01.linkHotspots[i];
        alreadyHasPiece05 = true;
      }
      if (scene01.linkHotspots[i].target === '5-06-la-incredulidad-de-santo-toms') {
        alreadyHasPiece06 = true;
      }
    }

    if (hotspotToPiece02 && !alreadyHasPiece03) {
      scene01.linkHotspots.push({
        yaw: hotspotToPiece02.yaw - 0.6,
        pitch: hotspotToPiece02.pitch - 0.08,
        rotation: hotspotToPiece02.rotation,
        target: '2-03-la-duda-de-santo-toms'
      });
      hotspotToPiece03 = scene01.linkHotspots[scene01.linkHotspots.length - 1];
    }

    if (hotspotToPiece03 && !alreadyHasPiece04) {
      scene01.linkHotspots.push({
        yaw: hotspotToPiece03.yaw - 0.24,
        pitch: hotspotToPiece03.pitch,
        rotation: hotspotToPiece03.rotation,
        target: '3-04-puerta-de-la-capilla-del-sagrario'
      });
      hotspotToPiece04 = scene01.linkHotspots[scene01.linkHotspots.length - 1];
    }

    if (hotspotToPiece04 && !alreadyHasPiece05) {
      scene01.linkHotspots.push({
        yaw: hotspotToPiece04.yaw - 0.16,
        pitch: hotspotToPiece04.pitch,
        rotation: hotspotToPiece04.rotation,
        target: '4-05-la-ascensin-de-cristo'
      });
      hotspotToPiece05 = scene01.linkHotspots[scene01.linkHotspots.length - 1];
    }

    if (!hotspotToPiece05 || alreadyHasPiece06) {
      return;
    }

    scene01.linkHotspots.push({
      yaw: hotspotToPiece05.yaw - 0.79,
      pitch: hotspotToPiece05.pitch,
      rotation: hotspotToPiece05.rotation,
      target: '5-06-la-incredulidad-de-santo-toms'
    });
  }

  function adjustPieceOneInitialView(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
        sceneDataList[i].initialViewParameters.yaw = sceneDataList[i].initialViewParameters.yaw - 0.68;
        return;
      }
    }
  }

  function ensurePieceTwoRightLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '1-02-los-discpulos-de-emas') {
        continue;
      }

      var scene02 = sceneDataList[i];
      var infoHotspot = scene02.infoHotspots && scene02.infoHotspots[0];
      var hasTarget = false;

      for (var j = 0; j < scene02.linkHotspots.length; j++) {
        if (scene02.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hasTarget = true;
          break;
        }
      }

      if (!infoHotspot || hasTarget) {
        return;
      }

      scene02.linkHotspots.push({
        yaw: infoHotspot.yaw + 0.92,
        pitch: infoHotspot.pitch + 0.4,
        rotation: 0,
        target: '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa'
      });
      return;
    }
  }

  function ensurePieceTwoLeftMirrorHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '1-02-los-discpulos-de-emas') {
        continue;
      }

      var scene02 = sceneDataList[i];
      var infoHotspot = scene02.infoHotspots && scene02.infoHotspots[0];
      var hasLeftMirror = false;

      for (var j = 0; j < scene02.linkHotspots.length; j++) {
        if (
          scene02.linkHotspots[j].target === '2-03-la-duda-de-santo-toms' &&
          scene02.linkHotspots[j].yaw < infoHotspot.yaw
        ) {
          hasLeftMirror = true;
          break;
        }
      }

      if (!infoHotspot || hasLeftMirror) {
        return;
      }

      scene02.linkHotspots.push({
        yaw: infoHotspot.yaw - 3.1,
        pitch: infoHotspot.pitch + 0.4,
        rotation: 0,
        target: '2-03-la-duda-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceTwoFourthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '1-02-los-discpulos-de-emas') {
        continue;
      }

      var scene02 = sceneDataList[i];
      var hotspotToPiece03 = null;
      var hasPiece04 = false;

      for (var j = 0; j < scene02.linkHotspots.length; j++) {
        if (scene02.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hotspotToPiece03 = scene02.linkHotspots[j];
        }
        if (scene02.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hasPiece04 = true;
        }
      }

      if (!hotspotToPiece03 || hasPiece04) {
        return;
      }

      scene02.linkHotspots.push({
        yaw: hotspotToPiece03.yaw - 0.18,
        pitch: hotspotToPiece03.pitch,
        rotation: hotspotToPiece03.rotation,
        target: '3-04-puerta-de-la-capilla-del-sagrario'
      });
      return;
    }
  }

  function ensurePieceTwoFifthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '1-02-los-discpulos-de-emas') {
        continue;
      }

      var scene02 = sceneDataList[i];
      var hotspotToPiece04 = null;
      var hasPiece05 = false;

      for (var j = 0; j < scene02.linkHotspots.length; j++) {
        if (scene02.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hotspotToPiece04 = scene02.linkHotspots[j];
        }
        if (scene02.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hasPiece05 = true;
        }
      }

      if (!hotspotToPiece04 || hasPiece05) {
        return;
      }

      scene02.linkHotspots.push({
        yaw: hotspotToPiece04.yaw - 0.14,
        pitch: hotspotToPiece04.pitch + 0.06,
        rotation: hotspotToPiece04.rotation,
        target: '4-05-la-ascensin-de-cristo'
      });
      return;
    }
  }

  function ensurePieceTwoSixthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '1-02-los-discpulos-de-emas') {
        continue;
      }

      var scene02 = sceneDataList[i];
      var hotspotToPiece05 = null;
      var hasPiece06 = false;

      for (var j = 0; j < scene02.linkHotspots.length; j++) {
        if (scene02.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hotspotToPiece05 = scene02.linkHotspots[j];
        }
        if (scene02.linkHotspots[j].target === '5-06-la-incredulidad-de-santo-toms') {
          hasPiece06 = true;
        }
      }

      if (!hotspotToPiece05 || hasPiece06) {
        return;
      }

      scene02.linkHotspots.push({
        yaw: hotspotToPiece05.yaw - 0.68,
        pitch: hotspotToPiece05.pitch,
        rotation: hotspotToPiece05.rotation,
        target: '5-06-la-incredulidad-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceThreeRightLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '2-03-la-duda-de-santo-toms') {
        continue;
      }

      var scene03 = sceneDataList[i];
      var infoHotspot = scene03.infoHotspots && scene03.infoHotspots[0];
      var hasTarget = false;

      for (var j = 0; j < scene03.linkHotspots.length; j++) {
        if (scene03.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hasTarget = true;
          break;
        }
      }

      if (!infoHotspot || hasTarget) {
        return;
      }

      scene03.linkHotspots.push({
        yaw: infoHotspot.yaw + 2.16,
        pitch: infoHotspot.pitch + 0.4,
        rotation: 0,
        target: '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa'
      });
      return;
    }
  }

  function ensurePieceThreeLeftLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '2-03-la-duda-de-santo-toms') {
        continue;
      }

      var scene03 = sceneDataList[i];
      var hotspotToPiece01 = null;
      var hasPiece02 = false;

      for (var j = 0; j < scene03.linkHotspots.length; j++) {
        if (scene03.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hotspotToPiece01 = scene03.linkHotspots[j];
        }
        if (scene03.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hasPiece02 = true;
        }
      }

      if (!hotspotToPiece01 || hasPiece02) {
        return;
      }

      scene03.linkHotspots.push({
        yaw: hotspotToPiece01.yaw - 4.08,
        pitch: hotspotToPiece01.pitch,
        rotation: hotspotToPiece01.rotation,
        target: '4-05-la-ascensin-de-cristo'
      });
      return;
    }
  }

  function ensurePieceThreeFourthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '2-03-la-duda-de-santo-toms') {
        continue;
      }

      var scene03 = sceneDataList[i];
      var hotspotToPiece05 = null;
      var hasPiece04 = false;

      for (var j = 0; j < scene03.linkHotspots.length; j++) {
        if (scene03.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hotspotToPiece05 = scene03.linkHotspots[j];
        }
        if (scene03.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hasPiece04 = true;
        }
      }

      if (!hotspotToPiece05 || hasPiece04) {
        return;
      }

      scene03.linkHotspots.push({
        yaw: hotspotToPiece05.yaw + 0.14,
        pitch: hotspotToPiece05.pitch,
        rotation: hotspotToPiece05.rotation,
        target: '3-04-puerta-de-la-capilla-del-sagrario'
      });
      return;
    }
  }

  function ensurePieceThreeSecondLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '2-03-la-duda-de-santo-toms') {
        continue;
      }

      var scene03 = sceneDataList[i];
      var hotspotToPiece01 = null;
      var hasPiece02 = false;

      for (var j = 0; j < scene03.linkHotspots.length; j++) {
        if (scene03.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hotspotToPiece01 = scene03.linkHotspots[j];
        }
        if (scene03.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hasPiece02 = true;
        }
      }

      if (!hotspotToPiece01 || hasPiece02) {
        return;
      }

      scene03.linkHotspots.push({
        yaw: hotspotToPiece01.yaw - 0.62,
        pitch: hotspotToPiece01.pitch,
        rotation: hotspotToPiece01.rotation,
        target: '1-02-los-discpulos-de-emas'
      });
      return;
    }
  }

  function ensurePieceThreeSixthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '2-03-la-duda-de-santo-toms') {
        continue;
      }

      var scene03 = sceneDataList[i];
      var hotspotToPiece05 = null;
      var hasPiece06 = false;

      for (var j = 0; j < scene03.linkHotspots.length; j++) {
        if (scene03.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hotspotToPiece05 = scene03.linkHotspots[j];
        }
        if (scene03.linkHotspots[j].target === '5-06-la-incredulidad-de-santo-toms') {
          hasPiece06 = true;
        }
      }

      if (!hotspotToPiece05 || hasPiece06) {
        return;
      }

      scene03.linkHotspots.push({
        yaw: hotspotToPiece05.yaw - 0.84,
        pitch: hotspotToPiece05.pitch + 0.04,
        rotation: hotspotToPiece05.rotation,
        target: '5-06-la-incredulidad-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceFourRightLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '3-04-puerta-de-la-capilla-del-sagrario') {
        continue;
      }

      var scene04 = sceneDataList[i];
      var infoHotspot = scene04.infoHotspots && scene04.infoHotspots[0];
      var hasRightHotspot = false;

      for (var j = 0; j < scene04.linkHotspots.length; j++) {
        if (scene04.linkHotspots[j].yaw > infoHotspot.yaw) {
          hasRightHotspot = true;
          break;
        }
      }

      if (!infoHotspot || hasRightHotspot) {
        return;
      }

      scene04.linkHotspots.push({
        yaw: infoHotspot.yaw + 0.58,
        pitch: infoHotspot.pitch + 0.46,
        rotation: 0,
        target: '2-03-la-duda-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceFourSecondLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '3-04-puerta-de-la-capilla-del-sagrario') {
        continue;
      }

      var scene04 = sceneDataList[i];
      var hotspotToPiece03 = null;
      var hasPiece02 = false;

      for (var j = 0; j < scene04.linkHotspots.length; j++) {
        if (scene04.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hotspotToPiece03 = scene04.linkHotspots[j];
        }
        if (scene04.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hasPiece02 = true;
        }
      }

      if (!hotspotToPiece03 || hasPiece02) {
        return;
      }

      scene04.linkHotspots.push({
        yaw: hotspotToPiece03.yaw + 0.58,
        pitch: hotspotToPiece03.pitch + 0.1,
        rotation: hotspotToPiece03.rotation,
        target: '1-02-los-discpulos-de-emas'
      });
      return;
    }
  }

  function ensurePieceFourFirstLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '3-04-puerta-de-la-capilla-del-sagrario') {
        continue;
      }

      var scene04 = sceneDataList[i];
      var hotspotToPiece02 = null;
      var hasPiece01 = false;

      for (var j = 0; j < scene04.linkHotspots.length; j++) {
        if (scene04.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hotspotToPiece02 = scene04.linkHotspots[j];
        }
        if (scene04.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hasPiece01 = true;
        }
      }

      if (!hotspotToPiece02 || hasPiece01) {
        return;
      }

      scene04.linkHotspots.push({
        yaw: hotspotToPiece02.yaw + 0.62,
        pitch: hotspotToPiece02.pitch,
        rotation: hotspotToPiece02.rotation,
        target: '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa'
      });
      return;
    }
  }

  function ensurePieceFourFifthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '3-04-puerta-de-la-capilla-del-sagrario') {
        continue;
      }

      var scene04 = sceneDataList[i];
      var hotspotToPiece03 = null;
      var hasPiece05 = false;

      for (var j = 0; j < scene04.linkHotspots.length; j++) {
        if (scene04.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hotspotToPiece03 = scene04.linkHotspots[j];
        }
        if (scene04.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hasPiece05 = true;
        }
      }

      if (!hotspotToPiece03 || hasPiece05) {
        return;
      }

      scene04.linkHotspots.push({
        yaw: hotspotToPiece03.yaw - 2.46,
        pitch: hotspotToPiece03.pitch + 0.08,
        rotation: hotspotToPiece03.rotation,
        target: '4-05-la-ascensin-de-cristo'
      });
      return;
    }
  }

  function ensurePieceFourSixthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '3-04-puerta-de-la-capilla-del-sagrario') {
        continue;
      }

      var scene04 = sceneDataList[i];
      var hotspotToPiece05 = null;
      var hasPiece06 = false;

      for (var j = 0; j < scene04.linkHotspots.length; j++) {
        if (scene04.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hotspotToPiece05 = scene04.linkHotspots[j];
        }
        if (scene04.linkHotspots[j].target === '5-06-la-incredulidad-de-santo-toms') {
          hasPiece06 = true;
        }
      }

      if (!hotspotToPiece05 || hasPiece06) {
        return;
      }

      scene04.linkHotspots.push({
        yaw: hotspotToPiece05.yaw - 1.22,
        pitch: hotspotToPiece05.pitch,
        rotation: hotspotToPiece05.rotation,
        target: '5-06-la-incredulidad-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceFiveRightLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '4-05-la-ascensin-de-cristo') {
        continue;
      }

      var scene05 = sceneDataList[i];
      var infoHotspot = scene05.infoHotspots && scene05.infoHotspots[0];
      var hasPiece04 = false;

      for (var j = 0; j < scene05.linkHotspots.length; j++) {
        if (scene05.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hasPiece04 = true;
          break;
        }
      }

      if (!infoHotspot || hasPiece04) {
        return;
      }

      scene05.linkHotspots.push({
        yaw: infoHotspot.yaw + 0.76,
        pitch: infoHotspot.pitch + 0.32,
        rotation: 0,
        target: '3-04-puerta-de-la-capilla-del-sagrario'
      });
      return;
    }
  }

  function ensurePieceFiveThirdLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '4-05-la-ascensin-de-cristo') {
        continue;
      }

      var scene05 = sceneDataList[i];
      var hotspotToPiece04 = null;
      var hasPiece03 = false;

      for (var j = 0; j < scene05.linkHotspots.length; j++) {
        if (scene05.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hotspotToPiece04 = scene05.linkHotspots[j];
        }
        if (scene05.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hasPiece03 = true;
        }
      }

      if (!hotspotToPiece04 || hasPiece03) {
        return;
      }

      scene05.linkHotspots.push({
        yaw: hotspotToPiece04.yaw + 0.08,
        pitch: hotspotToPiece04.pitch + 0.12,
        rotation: hotspotToPiece04.rotation,
        target: '2-03-la-duda-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceFiveSecondLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '4-05-la-ascensin-de-cristo') {
        continue;
      }

      var scene05 = sceneDataList[i];
      var hotspotToPiece03 = null;
      var hasPiece02 = false;

      for (var j = 0; j < scene05.linkHotspots.length; j++) {
        if (scene05.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hotspotToPiece03 = scene05.linkHotspots[j];
        }
        if (scene05.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hasPiece02 = true;
        }
      }

      if (!hotspotToPiece03 || hasPiece02) {
        return;
      }

      scene05.linkHotspots.push({
        yaw: hotspotToPiece03.yaw + 0.34,
        pitch: hotspotToPiece03.pitch + 0.04,
        rotation: hotspotToPiece03.rotation,
        target: '1-02-los-discpulos-de-emas'
      });
      return;
    }
  }

  function ensurePieceFiveFirstLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '4-05-la-ascensin-de-cristo') {
        continue;
      }

      var scene05 = sceneDataList[i];
      var hotspotToPiece02 = null;
      var hasPiece01 = false;

      for (var j = 0; j < scene05.linkHotspots.length; j++) {
        if (scene05.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hotspotToPiece02 = scene05.linkHotspots[j];
        }
        if (scene05.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hasPiece01 = true;
        }
      }

      if (!hotspotToPiece02 || hasPiece01) {
        return;
      }

      scene05.linkHotspots.push({
        yaw: hotspotToPiece02.yaw + 0.44,
        pitch: hotspotToPiece02.pitch,
        rotation: hotspotToPiece02.rotation,
        target: '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa'
      });
      return;
    }
  }

  function ensurePieceFiveSixthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '4-05-la-ascensin-de-cristo') {
        continue;
      }

      var scene05 = sceneDataList[i];
      var hotspotToPiece01 = null;
      var hasPiece06 = false;

      for (var j = 0; j < scene05.linkHotspots.length; j++) {
        if (scene05.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hotspotToPiece01 = scene05.linkHotspots[j];
        }
        if (scene05.linkHotspots[j].target === '5-06-la-incredulidad-de-santo-toms') {
          hasPiece06 = true;
        }
      }

      if (!hotspotToPiece01 || hasPiece06) {
        return;
      }

      scene05.linkHotspots.push({
        yaw: hotspotToPiece01.yaw + 1.28,
        pitch: hotspotToPiece01.pitch - 0.02,
        rotation: hotspotToPiece01.rotation,
        target: '5-06-la-incredulidad-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceSixFirstLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '5-06-la-incredulidad-de-santo-toms') {
        continue;
      }

      var scene06 = sceneDataList[i];
      var infoHotspot = scene06.infoHotspots && scene06.infoHotspots[0];
      var hasPiece01 = false;

      for (var j = 0; j < scene06.linkHotspots.length; j++) {
        if (scene06.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hasPiece01 = true;
          break;
        }
      }

      if (!infoHotspot || hasPiece01) {
        return;
      }

      scene06.linkHotspots.push({
        yaw: infoHotspot.yaw - 3.62,
        pitch: infoHotspot.pitch + 0.48,
        rotation: 0,
        target: '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa'
      });
      return;
    }
  }

  function ensurePieceSixSecondLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '5-06-la-incredulidad-de-santo-toms') {
        continue;
      }

      var scene06 = sceneDataList[i];
      var hotspotToPiece01 = null;
      var hasPiece02 = false;

      for (var j = 0; j < scene06.linkHotspots.length; j++) {
        if (scene06.linkHotspots[j].target === '0-01-lauda-sepulcral-de-lorenzo-surez-de-figueroa') {
          hotspotToPiece01 = scene06.linkHotspots[j];
        }
        if (scene06.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hasPiece02 = true;
        }
      }

      if (!hotspotToPiece01 || hasPiece02) {
        return;
      }

      scene06.linkHotspots.push({
        yaw: hotspotToPiece01.yaw - 0.42,
        pitch: hotspotToPiece01.pitch + 0.04,
        rotation: hotspotToPiece01.rotation,
        target: '1-02-los-discpulos-de-emas'
      });
      return;
    }
  }

  function ensurePieceSixThirdLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '5-06-la-incredulidad-de-santo-toms') {
        continue;
      }

      var scene06 = sceneDataList[i];
      var hotspotToPiece02 = null;
      var hasPiece03 = false;

      for (var j = 0; j < scene06.linkHotspots.length; j++) {
        if (scene06.linkHotspots[j].target === '1-02-los-discpulos-de-emas') {
          hotspotToPiece02 = scene06.linkHotspots[j];
        }
        if (scene06.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hasPiece03 = true;
        }
      }

      if (!hotspotToPiece02 || hasPiece03) {
        return;
      }

      scene06.linkHotspots.push({
        yaw: hotspotToPiece02.yaw - 0.36,
        pitch: hotspotToPiece02.pitch,
        rotation: hotspotToPiece02.rotation,
        target: '2-03-la-duda-de-santo-toms'
      });
      return;
    }
  }

  function ensurePieceSixFourthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '5-06-la-incredulidad-de-santo-toms') {
        continue;
      }

      var scene06 = sceneDataList[i];
      var hotspotToPiece03 = null;
      var hasPiece04 = false;

      for (var j = 0; j < scene06.linkHotspots.length; j++) {
        if (scene06.linkHotspots[j].target === '2-03-la-duda-de-santo-toms') {
          hotspotToPiece03 = scene06.linkHotspots[j];
        }
        if (scene06.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hasPiece04 = true;
        }
      }

      if (!hotspotToPiece03 || hasPiece04) {
        return;
      }

      scene06.linkHotspots.push({
        yaw: hotspotToPiece03.yaw - 0.18,
        pitch: hotspotToPiece03.pitch,
        rotation: hotspotToPiece03.rotation,
        target: '3-04-puerta-de-la-capilla-del-sagrario'
      });
      return;
    }
  }

  function ensurePieceSixFifthLinkHotspot(sceneDataList) {
    for (var i = 0; i < sceneDataList.length; i++) {
      if (sceneDataList[i].id !== '5-06-la-incredulidad-de-santo-toms') {
        continue;
      }

      var scene06 = sceneDataList[i];
      var hotspotToPiece04 = null;
      var hasPiece05 = false;

      for (var j = 0; j < scene06.linkHotspots.length; j++) {
        if (scene06.linkHotspots[j].target === '3-04-puerta-de-la-capilla-del-sagrario') {
          hotspotToPiece04 = scene06.linkHotspots[j];
        }
        if (scene06.linkHotspots[j].target === '4-05-la-ascensin-de-cristo') {
          hasPiece05 = true;
        }
      }

      if (!hotspotToPiece04 || hasPiece05) {
        return;
      }

      scene06.linkHotspots.push({
        yaw: hotspotToPiece04.yaw - 0.28,
        pitch: hotspotToPiece04.pitch - 0.04,
        rotation: hotspotToPiece04.rotation,
        target: '4-05-la-ascensin-de-cristo'
      });
      return;
    }
  }

  function createMapPlaceholderDataUri(label) {
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">',
      '<defs>',
      '<linearGradient id="tourGradient" x1="0%" y1="0%" x2="100%" y2="100%">',
      '<stop offset="0%" stop-color="#53657d" />',
      '<stop offset="100%" stop-color="#313d4d" />',
      '</linearGradient>',
      '</defs>',
      '<rect width="900" height="600" fill="url(#tourGradient)" rx="32" ry="32" />',
      '<rect x="54" y="54" width="792" height="492" fill="none" stroke="rgba(255,255,255,0.24)" stroke-width="6" rx="26" ry="26" />',
      '<text x="450" y="290" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="42" fill="#ffffff" opacity="0.95">' + escapeXml(label) + '</text>',
      '<text x="450" y="344" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#dbe2ea" opacity="0.82">Sustituye la imagen en TOUR_DATA.map.image cuando tengas el mapa final.</text>',
      '</svg>'
    ].join('');

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function setMapImageSource(mapData) {
    if (!mapData) {
      mapImageElement.dataset.fallback = '';
      mapImageElement.removeAttribute('src');
      return;
    }

    var fallbackSource = createMapPlaceholderDataUri(mapData.label);
    mapImageElement.dataset.fallback = fallbackSource;
    mapImageElement.src = mapData.image || fallbackSource;
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }
})();
