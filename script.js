const oracleAddress = "0xF21FE4e177679fc0d2Aa0b7cB8BdE0b840409e25";
const bwcTokenAddress = "0x57a8F55a341B0d157d45AceB5ea2BbaB623c882C";

const oracleAbi = [
  "function getBWCPriceInUSD() view returns (uint256)"
];

const tokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

let provider;
let signer;
let token;
let oracle;

async function initializeProvider() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask não foi encontrada. Instale a extensão para continuar.");
    throw new Error("MetaMask não detectada.");
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  token = new ethers.Contract(bwcTokenAddress, tokenAbi, provider);
  oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);
}

async function loadPrice() {
  try {
    await initializeProvider();

    const price = await oracle.getBWCPriceInUSD();
    const formattedPrice = Number(ethers.utils.formatUnits(price, 18)).toFixed(4);
    document.getElementById("bwcPrice").innerText = `$${formattedPrice}`;
    return price;
  } catch (error) {
    console.error("Erro ao carregar preço:", error);
    document.getElementById("bwcPrice").innerText = "Erro ao obter o preço.";
  }
}

async function connectWallet() {
  try {
    await initializeProvider();

    await provider.send("eth_requestAccounts", []);
    const address = await signer.getAddress();

    document.getElementById("walletAddress").innerText = `Conectado: ${address}`;
    document.getElementById("balanceSection").style.display = "block";

    const [decimals, symbol, rawBalance, price] = await Promise.all([
      token.decimals(),
      token.symbol(),
      token.balanceOf(address),
      oracle.getBWCPriceInUSD()
    ]);

    const balance = Number(ethers.utils.formatUnits(rawBalance, decimals)).toFixed(4);
    const usdPrice = Number(ethers.utils.formatUnits(price, 18));
    const usdValue = (usdPrice * balance).toFixed(4);

    document.getElementById("bwcBalance").innerText = `${balance} ${symbol}`;
    document.getElementById("usdValue").innerText = `$${usdValue}`;
  } catch (error) {
    console.error("Erro ao conectar carteira:", error);
    alert("Erro ao conectar a carteira. Verifique se a MetaMask está desbloqueada e conectada à rede correta.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const connectButton = document.getElementById("connectButton");
  if (connectButton) {
    connectButton.addEventListener("click", connectWallet);
  }

  loadPrice();
});
