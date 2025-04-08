"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Wallet, DollarSign, RefreshCw, AlertTriangle } from "lucide-react"

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceLoading, setIsPriceLoading] = useState(true)
  const [address, setAddress] = useState("")
  const [balance, setBalance] = useState("0")
  const [symbol, setSymbol] = useState("BWC")
  const [price, setPrice] = useState("0")
  const [usdValue, setUsdValue] = useState("0")
  const [error, setError] = useState("")
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)
  const [needsNetworkSwitch, setNeedsNetworkSwitch] = useState(false)

  // BSC Mainnet Chain ID
  const BSC_CHAIN_ID = 56

  const oracleAddress = "0xF21FE4e177679fc0d2Aa0b7cB8BdE0b840409e25"
  const bwcTokenAddress = "0x57a8F55a341B0d157d45AceB5ea2BbaB623c882C"

  const oracleAbi = ["function getBWCPriceInUSD() view returns (uint256)"]

  const tokenAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ]

  useEffect(() => {
    checkNetwork()
    loadPrice()

    // Listen for chain changes
    if (window.ethereum) {
      window.ethereum.on("chainChanged", (chainId: string) => {
        setCurrentChainId(Number.parseInt(chainId, 16))
        checkNetwork()
        loadPrice()
      })
    }

    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", () => {})
      }
    }
  }, [])

  async function checkNetwork() {
    if (typeof window.ethereum === "undefined") {
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      setCurrentChainId(chainId)

      if (chainId !== BSC_CHAIN_ID) {
        setNeedsNetworkSwitch(true)
      } else {
        setNeedsNetworkSwitch(false)
      }
    } catch (error) {
      console.error("Erro ao verificar rede:", error)
    }
  }

  async function switchToBSC() {
    if (typeof window.ethereum === "undefined") {
      setError("MetaMask não detectada")
      return
    }

    try {
      setIsLoading(true)
      // Try to switch to BSC
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }], // 0x38 is hexadecimal for 56
      })

      // Refresh page data
      await checkNetwork()
      await loadPrice()
      setError("")
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x38",
                chainName: "Binance Smart Chain Mainnet",
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                blockExplorerUrls: ["https://bscscan.com/"],
              },
            ],
          })
          // Check network again after adding
          await checkNetwork()
          await loadPrice()
          setError("")
        } catch (addError) {
          console.error("Erro ao adicionar rede BSC:", addError)
          setError("Não foi possível adicionar a rede BSC Mainnet. Adicione manualmente nas configurações do MetaMask.")
        }
      } else {
        console.error("Erro ao trocar para BSC:", switchError)
        setError("Não foi possível trocar para a rede BSC Mainnet. Troque manualmente nas configurações do MetaMask.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPrice() {
    try {
      setIsPriceLoading(true)
      setError("")

      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask não detectada")
      }

      const provider = new ethers.BrowserProvider(window.ethereum)

      // Get current chain ID
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      setCurrentChainId(chainId)

      // Check if we're on BSC Mainnet
      if (chainId !== BSC_CHAIN_ID) {
        setNeedsNetworkSwitch(true)
        throw new Error("Rede incorreta. Por favor, conecte-se à BSC Mainnet para ver o preço.")
      }

      try {
        const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider)

        // Add timeout to prevent hanging
        const pricePromise = Promise.race([
          oracle.getBWCPriceInUSD(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Tempo esgotado ao obter o preço")), 10000)),
        ])

        const price = await pricePromise
        const formattedPrice = Number(ethers.formatUnits(price, 18)).toFixed(4)
        setPrice(formattedPrice)
      } catch (contractError) {
        console.error("Erro ao chamar contrato oracle:", contractError)
        throw new Error(`Erro ao acessar o contrato oracle: ${contractError.message}`)
      }
    } catch (error) {
      console.error("Erro ao carregar preço:", error)
      setError(error.message || "Erro ao obter o preço. Verifique sua conexão com a blockchain.")
    } finally {
      setIsPriceLoading(false)
    }
  }

  async function connectWallet() {
    try {
      setIsLoading(true)
      setError("")

      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask não detectada")
      }

      const provider = new ethers.BrowserProvider(window.ethereum)

      // Get current chain ID
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)
      setCurrentChainId(chainId)

      // Check if we're on BSC Mainnet
      if (chainId !== BSC_CHAIN_ID) {
        setNeedsNetworkSwitch(true)
        throw new Error("Rede incorreta. Por favor, conecte-se à BSC Mainnet para visualizar seus tokens.")
      }

      // Request accounts with detailed error handling
      try {
        await provider.send("eth_requestAccounts", [])
      } catch (requestError) {
        console.error("Erro ao solicitar contas:", requestError)
        if (requestError.code === 4001) {
          throw new Error("Conexão rejeitada. Por favor, aprove a conexão no MetaMask.")
        } else {
          throw new Error("Falha ao conectar com MetaMask. Tente desbloquear sua carteira.")
        }
      }

      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      setAddress(userAddress)

      // Verify contracts exist before interacting
      try {
        const token = new ethers.Contract(bwcTokenAddress, tokenAbi, provider)
        const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider)

        // Test contract calls with timeout to prevent hanging
        const tokenCallPromise = Promise.race([
          token.symbol(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tempo esgotado ao chamar o contrato do token")), 10000),
          ),
        ])

        const oracleCallPromise = Promise.race([
          oracle.getBWCPriceInUSD(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tempo esgotado ao chamar o contrato do oracle")), 10000),
          ),
        ])

        await Promise.all([tokenCallPromise, oracleCallPromise])

        // If we get here, contracts are responsive
        const decimals = await token.decimals()
        const tokenSymbol = await token.symbol()
        const rawBalance = await token.balanceOf(userAddress)
        const tokenPrice = await oracle.getBWCPriceInUSD()

        const formattedBalance = Number(ethers.formatUnits(rawBalance, decimals)).toFixed(4)
        const usdPrice = Number(ethers.formatUnits(tokenPrice, 18))
        const calculatedUsdValue = (usdPrice * Number.parseFloat(formattedBalance)).toFixed(2)

        setSymbol(tokenSymbol)
        setBalance(formattedBalance)
        setUsdValue(calculatedUsdValue)
        setIsConnected(true)
      } catch (contractError) {
        console.error("Erro ao interagir com contratos:", contractError)
        throw new Error(`Erro ao acessar os contratos: ${contractError.message}`)
      }
    } catch (error) {
      console.error("Erro ao conectar carteira:", error)
      setError(
        error.message ||
          "Erro ao conectar a carteira. Verifique se a MetaMask está desbloqueada e conectada à rede correta.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Get network name from chain ID
  const getNetworkName = (chainId: number | null) => {
    if (chainId === null) return "Desconhecida"

    const networks = {
      1: "Ethereum Mainnet",
      56: "BSC Mainnet",
      137: "Polygon",
      43114: "Avalanche",
      250: "Fantom",
      42161: "Arbitrum",
      10: "Optimism",
    }

    return networks[chainId] || `Chain ID ${chainId}`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="w-full bg-white/5 backdrop-blur-sm border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">BWC Token Dashboard</CardTitle>
            <CardDescription className="text-gray-300">Verifique o preço e seu saldo de BWC Token</CardDescription>
          </CardHeader>

          {needsNetworkSwitch && (
            <div className="px-6 py-3 bg-yellow-900/30 border border-yellow-800/50 rounded-md mx-6 mb-4">
              <div className="text-yellow-300 text-sm">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Rede incorreta detectada</span>
                </div>
                <p className="mb-2">
                  Você está conectado à rede <strong>{getNetworkName(currentChainId)}</strong>, mas o token BWC está na{" "}
                  <strong>BSC Mainnet</strong>.
                </p>
                <Button
                  onClick={switchToBSC}
                  className="w-full bg-yellow-700 hover:bg-yellow-600 text-white mt-1"
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Trocando...
                    </>
                  ) : (
                    "Trocar para BSC Mainnet"
                  )}
                </Button>
              </div>
            </div>
          )}

          <CardContent className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400 mb-1">Preço Atual do BWC</p>
              {isPriceLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-2xl font-bold text-white">{price} USD</span>
                </div>
              )}
              <button
                onClick={loadPrice}
                className="mt-2 text-xs text-blue-400 flex items-center justify-center mx-auto"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Atualizar preço
              </button>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 mb-1">Carteira Conectada</p>
                  <p className="text-white font-mono text-sm truncate">{address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-gray-400 mb-1">Seu Saldo</p>
                    <p className="text-xl font-bold text-white">
                      {balance} {symbol}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-gray-400 mb-1">Valor em USD</p>
                    <p className="text-xl font-bold text-green-400">${usdValue}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Conectar Carteira
                  </>
                )}
              </Button>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-3 rounded-md text-sm">{error}</div>
            )}
          </CardContent>

          <CardFooter className="text-center text-xs text-gray-500">
            <p className="w-full">Este token está na rede BSC Mainnet (Binance Smart Chain)</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
