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

let provider, signer, token, oracle;

async function loadPrice() {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);
  const price = await oracle.getBWCPriceInUSD();
  const formattedPrice = Number(ethers.utils.formatUnits(price, 18)).toFixed(4);
  document.getElementById("bwcPrice").innerText = `$${formattedPrice}`;
  return price;
}

async function connectWallet() {
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  const address = await signer.getAddress();
  document.getElementById("walletAddress").innerText = `Conectado: ${address}`;
  document.getElementById("balanceSection").style.display = "block";

  token = new ethers.Contract(bwcTokenAddress, tokenAbi, signer);
  const decimals = await token.decimals();
  const symbol = await token.symbol();
  const rawBalance = await token.balanceOf(address);
  const balance = Number(ethers.utils.formatUnits(rawBalance, decimals)).toFixed(4);
  document.getElementById("bwcBalance").innerText = `${balance} ${symbol}`;

  const price = await oracle.getBWCPriceInUSD();
  const usdValue = (Number(ethers.utils.formatUnits(price, 18)) * balance).toFixed(4);
  document.getElementById("usdValue").innerText = `$${usdValue}`;
}

document.getElementById("connectButton").addEventListener("click", connectWallet);

loadPrice();
