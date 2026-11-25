'use strict';

window.BoardCanvas = (() => {
  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 2.4;
  const PALETTE = [
    { id: 'sun', label: 'Жёлтый' },
    { id: 'pink', label: 'Розовый' },
    { id: 'blue', label: 'Голубой' },
    { id: 'mint', label: 'Мятный' },
  ];
  const TYPES = {
    sticky: { label: 'Стикер', placeholder: 'Добавьте идею…' },
    text: { label: 'Текст', placeholder: 'Добавьте текст…' },
    shape: { label: 'Фигура', placeholder: 'Напишите внутри…' },
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);

  let canvas = null;
  let world = null;
  let board = null;
  let pointer = null;
  let connectMode = false;
  let sourceNodeId = null;
  let onChange = () => {};
  let onModeChange = () => {};
  let onZoomChange = () => {};

  function getNode(id) {
    return board?.elements.find((node) => node.id === id) || null;
  }

  function getNodeElement(id) {
    return [...(world?.querySelectorAll('.board-node') || [])].find((node) => node.dataset.nodeId === id) || null;
  }

  function ensureCamera() {
    if (!board.camera || typeof board.camera !== 'object') board.camera = { x: 0, y: 0, zoom: 1 };
    board.camera.x = clamp(finite(board.camera.x), -10000, 10000);
    board.camera.y = clamp(finite(board.camera.y), -10000, 10000);
    board.camera.zoom = clamp(finite(board.camera.zoom, 1), MIN_ZOOM, MAX_ZOOM);
  }

  function renderConnections() {
    const nodes = new Map(board.elements.map((node) => [node.id, node]));
    const lines = board.connections.map((connection) => {
      const from = nodes.get(connection.from);
      const to = nodes.get(connection.to);
      if (!from || !to) return '';
      return `<line x1="${finite(from.x)}" y1="${finite(from.y)}" x2="${finite(to.x)}" y2="${finite(to.y)}" marker-end="url(#board-arrowhead)"></line>`;
    }).join('');

    return `<svg class="board-links" viewBox="-5000 -5000 10000 10000" width="10000" height="10000" aria-hidden="true">
      <defs><marker id="board-arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z"></path></marker></defs>
      ${lines}
    </svg>`;
  }

  function nodeMarkup(node) {
    const type = Object.hasOwn(TYPES, node.type) ? node.type : 'sticky';
    const color = PALETTE.some((entry) => entry.id === node.color) ? node.color : 'sun';
    const config = TYPES[type];
    node.type = type;
    node.color = color;
    node.x = clamp(finite(node.x), -10000, 10000);
    node.y = clamp(finite(node.y), -10000, 10000);
    node.text = String(node.text ?? '').slice(0, 4000);

    const palette = type === 'text' ? '' : `<div class="board-node-palette" aria-label="Цвет элемента">
      ${PALETTE.map((entry) => `<button type="button" class="board-color-swatch" data-board-color="${entry.id}" aria-label="${entry.label}" aria-pressed="${entry.id === color}" title="${entry.label}"></button>`).join('')}
    </div>`;

    return `<article class="board-node board-node--${type}" data-node-id="${escapeHTML(node.id)}" data-color="${color}" style="left:${node.x}px;top:${node.y}px">
      <div class="board-node-head" data-board-handle tabindex="0" aria-label="Переместить элемент клавишами со стрелками">
        <span class="board-grip" aria-hidden="true"></span>
        <span class="board-node-kind">${config.label}</span>
        <button type="button" class="board-node-remove" data-board-remove aria-label="Удалить элемент" title="Удалить элемент">&times;</button>
      </div>
      <textarea class="board-node-text" data-board-text maxlength="4000" aria-label="${config.label}: текст" placeholder="${config.placeholder}" spellcheck="false">${escapeHTML(node.text)}</textarea>
      ${palette}
    </article>`;
  }

  function setTransform() {
    if (!canvas || !world || !board) return;
    ensureCamera();
    world.style.transform = `translate(${board.camera.x}px, ${board.camera.y}px) scale(${board.camera.zoom})`;
    onZoomChange(board.camera.zoom);
  }

  function render(nextBoard = board) {
    if (!world) return;
    if (board?.id !== nextBoard?.id) {
      connectMode = false;
      sourceNodeId = null;
      onModeChange(false);
    }
    board = nextBoard || null;
    if (!board) {
      world.replaceChildren();
      return;
    }
    if (!Array.isArray(board.elements)) board.elements = [];
    if (!Array.isArray(board.connections)) board.connections = [];
    ensureCamera();
    world.innerHTML = renderConnections() + board.elements.map(nodeMarkup).join('');
    const empty = canvas.parentElement.querySelector('.board-empty-canvas');
    if (empty) empty.hidden = board.elements.length > 0;
    setTransform();
    canvas.classList.toggle('is-connecting', connectMode);
    if (sourceNodeId) getNodeElement(sourceNodeId)?.classList.add('is-connect-source');
  }

  function updateConnectionMode(enabled) {
    connectMode = Boolean(enabled);
    sourceNodeId = null;
    world?.querySelectorAll('.is-connect-source').forEach((node) => node.classList.remove('is-connect-source'));
    canvas?.classList.toggle('is-connecting', connectMode);
    onModeChange(connectMode);
  }

  function connectNode(id) {
    if (!connectMode || !getNode(id)) return;
    if (!sourceNodeId) {
      sourceNodeId = id;
      getNodeElement(id)?.classList.add('is-connect-source');
      return;
    }
    if (sourceNodeId !== id && !board.connections.some((connection) =>
      (connection.from === sourceNodeId && connection.to === id) || (connection.from === id && connection.to === sourceNodeId))) {
      board.connections.push({ from: sourceNodeId, to: id });
    }
    sourceNodeId = null;
    updateConnectionMode(false);
    render(board);
    onChange();
  }

  function zoomAt(clientX, clientY, factor) {
    if (!canvas || !board) return;
    const rect = canvas.getBoundingClientRect();
    const oldZoom = board.camera.zoom;
    const nextZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = (localX - rect.width / 2 - board.camera.x) / oldZoom;
    const worldY = (localY - rect.height / 2 - board.camera.y) / oldZoom;
    board.camera.x = localX - rect.width / 2 - worldX * nextZoom;
    board.camera.y = localY - rect.height / 2 - worldY * nextZoom;
    board.camera.zoom = nextZoom;
    setTransform();
    onChange();
  }

  function zoomBy(factor) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function fitToBoard() {
    if (!canvas || !board) return;
    if (!board.elements.length) {
      board.camera = { x: 0, y: 0, zoom: 1 };
      setTransform();
      onChange();
      return;
    }
    const bounds = board.elements.reduce((result, node) => {
      const width = node.type === 'text' ? 280 : 236;
      const height = node.type === 'text' ? 124 : 184;
      return {
        left: Math.min(result.left, node.x - width / 2),
        right: Math.max(result.right, node.x + width / 2),
        top: Math.min(result.top, node.y - height / 2),
        bottom: Math.max(result.bottom, node.y + height / 2),
      };
    }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const zoom = clamp(Math.min((canvas.clientWidth - 120) / width, (canvas.clientHeight - 120) / height), MIN_ZOOM, 1.5);
    board.camera.zoom = zoom;
    board.camera.x = -((bounds.left + bounds.right) / 2) * zoom;
    board.camera.y = -((bounds.top + bounds.bottom) / 2) * zoom;
    setTransform();
    onChange();
  }

  function handlePointerDown(event) {
    if (!board || event.button !== 0 || connectMode) return;
    const nodeElement = event.target.closest('.board-node');
    const handle = event.target.closest('[data-board-handle]');
    if (nodeElement && handle && !event.target.closest('button')) {
      const node = getNode(nodeElement.dataset.nodeId);
      if (!node) return;
      event.preventDefault();
      pointer = {
        id: event.pointerId,
        type: 'node',
        nodeId: node.id,
        startX: event.clientX,
        startY: event.clientY,
        nodeX: node.x,
        nodeY: node.y,
        zoom: board.camera.zoom,
        moved: false,
      };
      canvas.setPointerCapture(event.pointerId);
      nodeElement.classList.add('is-dragging');
      return;
    }
    if (nodeElement || event.target.closest('button, input, textarea')) return;
    pointer = {
      id: event.pointerId,
      type: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      cameraX: board.camera.x,
      cameraY: board.camera.y,
      moved: false,
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-panning');
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId || !board) return;
    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) pointer.moved = true;
    if (pointer.type === 'pan') {
      board.camera.x = pointer.cameraX + deltaX;
      board.camera.y = pointer.cameraY + deltaY;
      setTransform();
      return;
    }
    const node = getNode(pointer.nodeId);
    const nodeElement = getNodeElement(pointer.nodeId);
    if (!node || !nodeElement) return;
    node.x = clamp(pointer.nodeX + deltaX / pointer.zoom, -10000, 10000);
    node.y = clamp(pointer.nodeY + deltaY / pointer.zoom, -10000, 10000);
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    const links = world.querySelector('.board-links');
    if (links) links.outerHTML = renderConnections();
  }

  function handlePointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const finished = pointer;
    pointer = null;
    canvas.classList.remove('is-panning');
    if (finished.type === 'node') getNodeElement(finished.nodeId)?.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (finished.moved) onChange();
  }

  function handleWheel(event) {
    if (!board || !canvas.contains(event.target)) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.08 : 1 / 1.08);
  }

  function handleWorldClick(event) {
    const colorButton = event.target.closest('[data-board-color]');
    if (colorButton) {
      const nodeElement = colorButton.closest('.board-node');
      const node = nodeElement && getNode(nodeElement.dataset.nodeId);
      const color = PALETTE.find((entry) => entry.id === colorButton.dataset.boardColor)?.id;
      if (!node || !color) return;
      node.color = color;
      nodeElement.dataset.color = color;
      nodeElement.querySelectorAll('[data-board-color]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.boardColor === color));
      });
      onChange();
      return;
    }

    if (event.target.closest('[data-board-remove]')) {
      const nodeElement = event.target.closest('.board-node');
      const nodeId = nodeElement?.dataset.nodeId;
      if (!nodeId || !board) return;
      board.elements = board.elements.filter((node) => node.id !== nodeId);
      board.connections = board.connections.filter((connection) => connection.from !== nodeId && connection.to !== nodeId);
      if (sourceNodeId === nodeId) updateConnectionMode(false);
      render(board);
      onChange();
      return;
    }

    if (connectMode) {
      const nodeElement = event.target.closest('.board-node');
      if (nodeElement) {
        event.preventDefault();
        connectNode(nodeElement.dataset.nodeId);
      }
    }
  }

  function handleWorldInput(event) {
    if (!event.target.matches('[data-board-text]')) return;
    const nodeElement = event.target.closest('.board-node');
    const node = nodeElement && getNode(nodeElement.dataset.nodeId);
    if (!node) return;
    node.text = event.target.value.slice(0, 4000);
    onChange();
  }

  function handleWorldKeydown(event) {
    const handle = event.target.closest('[data-board-handle]');
    if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const nodeElement = handle.closest('.board-node');
    const node = nodeElement && getNode(nodeElement.dataset.nodeId);
    if (!node) return;
    const step = event.shiftKey ? 20 : 5;
    if (event.key === 'ArrowLeft') node.x -= step;
    if (event.key === 'ArrowRight') node.x += step;
    if (event.key === 'ArrowUp') node.y -= step;
    if (event.key === 'ArrowDown') node.y += step;
    nodeElement.style.left = `${node.x}px`;
    nodeElement.style.top = `${node.y}px`;
    const links = world.querySelector('.board-links');
    if (links) links.outerHTML = renderConnections();
    event.preventDefault();
    onChange();
  }

  function mount(options) {
    if (canvas === options.canvas) {
      onChange = options.onChange || onChange;
      onModeChange = options.onModeChange || onModeChange;
      onZoomChange = options.onZoomChange || onZoomChange;
      return;
    }
    canvas = options.canvas;
    world = options.world;
    onChange = options.onChange || (() => {});
    onModeChange = options.onModeChange || (() => {});
    onZoomChange = options.onZoomChange || (() => {});
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    world.addEventListener('click', handleWorldClick);
    world.addEventListener('input', handleWorldInput);
    world.addEventListener('keydown', handleWorldKeydown);
  }

  return {
    mount,
    render,
    setConnectMode: updateConnectionMode,
    isConnectMode: () => connectMode,
    zoomBy,
    fitToBoard,
  };
})();
