let printerCharacteristic = null;
let pairedDevice = null;
let listeners = [];

export function subscribeToPrinterState(callback) {
  listeners.push(callback);
  // trigger immediately
  callback(getPrinterState());
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyListeners() {
  const state = getPrinterState();
  listeners.forEach(callback => {
    try { callback(state); } catch(e) { console.error(e); }
  });
}

export function getPrinterState() {
  return {
    connected: !!printerCharacteristic && !!pairedDevice && pairedDevice.gatt.connected,
    name: pairedDevice ? pairedDevice.name : null
  };
}

export async function connectBluetoothPrinter() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '0000ff00-0000-1000-8000-00805f9b34fb', // standard custom printer GATT UUID
        'generic_access', 
        0xff00, 
        0x18f0
      ]
    });

    const server = await device.gatt.connect();
    
    // Attempt standard services
    let service = null;
    const serviceUUIDs = ['0000ff00-0000-1000-8000-00805f9b34fb', 0xff00, 0x18f0];
    
    for (const uuid of serviceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch (e) {
        // ignore and try next
      }
    }
    
    if (!service) {
      // Fallback: try to fetch all primary services
      try {
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          service = services[0];
        }
      } catch (e) {
        // ignore
      }
    }

    if (!service) {
      throw new Error("Could not find GATT printer service on the selected device.");
    }

    const characteristics = await service.getCharacteristics();
    printerCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

    if (!printerCharacteristic) {
      throw new Error("No writeable characteristic found on printer.");
    }

    pairedDevice = device;
    
    device.addEventListener('gattserverdisconnected', onDisconnected);
    
    notifyListeners();
    return device.name;
  } catch (error) {
    console.error("Bluetooth pairing error:", error);
    throw error;
  }
}

function onDisconnected() {
  printerCharacteristic = null;
  pairedDevice = null;
  notifyListeners();
}

export async function disconnectBluetoothPrinter() {
  if (pairedDevice && pairedDevice.gatt.connected) {
    pairedDevice.gatt.disconnect();
  }
  onDisconnected();
}

export async function printProductLabel(product) {
  if (!printerCharacteristic) {
    throw new Error("No paired printer. Connect via Bluetooth first.");
  }

  const sizeLabel = product.size_label || `${product.width}x${product.height}x${product.depth || '-'}`;
  
  // ZPL Layout for 50mm x 30mm thermal sticker labels
  const zplData = `^XA
^FO50,20^A0N,28,28^FDMetalMint Wardrobes^FS
^FO50,55^A0N,22,22^FDModel: ${product.product_type_name || product.product_type_code || 'Standard'}^FS
^FO50,85^A0N,20,20^FDSize: ${sizeLabel} in^FS
^FO50,115^A0N,20,20^FDOpts: ${product.doors || '2-Door'} | ${product.weight_class || 'Heavy'}^FS
^FO50,145^A0N,18,18^FDMfg: ${new Date(product.manufacturing_date).toLocaleDateString()}^FS
^FO50,175^A0N,20,20^FDCode: ${product.product_code}^FS
^FO320,50^BQN,2,4^FDMA,${product.qr_url || `/qr/${product.product_code}`}^FS
^XZ`;

  const encoder = new TextEncoder();
  const bytes = encoder.encode(zplData);
  
  // Send bytes via BLE characteristic
  await printerCharacteristic.writeValue(bytes);
}
