<script lang="ts">
  import { checkBluetooth } from './ble/availability';
  import { BleConnector } from './ble/BleConnector';

  const availability = checkBluetooth();
  const connector = new BleConnector();

  let connecting = false;

  async function toggleConnect() {
    if (connector.isConnected) {
      await connector.disconnect();
      return;
    }
    connecting = true;
    try {
      await connector.connect({ acceptAnyDevice: false });
    } catch (err) {
      alert(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      connecting = false;
    }
  }
</script>

<svelte:head>
  <title>Chihiros LED Control</title>
</svelte:head>

<main>
  <header>
    <h1>Chihiros LED Control</h1>
    <p class="sub">Unofficial community PWA — no vendor app required.</p>
  </header>

  <section class="card">
    <h2>Bluetooth</h2>

    {#if availability.supported}
      <p class="ok">✔ Web Bluetooth is available.</p>
    {:else}
      <p class="bad">
        ✘ {availability.reason}
        {#if availability.outdatedBrowser}
          (Web Bluetooth exists but this browser build is outdated.)
        {/if}
      </p>
    {/if}

    <div class="status">
      <span class="dot {connector.state}"></span>
      <span>
        {connector.state === 'connected'
          ? 'Connected'
          : connector.state === 'connecting'
            ? 'Connecting…'
            : connector.state === 'error'
              ? 'Error'
              : 'Disconnected'}
      </span>
    </div>

    <button
      on:click={toggleConnect}
      disabled={!availability.supported || connector.state === 'connecting'}
      class:connecting
    >
      {connector.state === 'connected'
        ? 'Disconnect'
        : connecting
          ? 'Connecting…'
          : 'Connect device'}
    </button>
  </section>

  <footer>
    <p>
      Next: connect the protocol layer, then read status and control channels.
      See <a href="/PLAN.md">PLAN.md</a>.
    </p>
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0b1220;
    color: #e6eaf2;
  }

  main {
    max-width: 560px;
    margin: 0 auto;
    padding: 24px;
  }

  h1 {
    font-size: 1.5rem;
    margin: 0 0 4px;
  }

  .sub {
    margin: 0 0 24px;
    color: #9aa4b8;
    font-size: 0.9rem;
  }

  .card {
    background: #141c2e;
    border: 1px solid #232c42;
    border-radius: 12px;
    padding: 20px;
  }

  h2 {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }

  .ok {
    color: #4ade80;
  }

  .bad {
    color: #f87171;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0;
    font-weight: 500;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #64748b;
  }

  .dot.connected {
    background: #4ade80;
    box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.2);
  }

  .dot.connecting {
    background: #fbbf24;
  }

  .dot.error {
    background: #f87171;
  }

  button {
    width: 100%;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    font-size: 1rem;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.connecting {
    background: #2563eb;
  }

  footer {
    margin-top: 24px;
    color: #9aa4b8;
    font-size: 0.85rem;
  }
</style>
