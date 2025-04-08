"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Wallet, DollarSign, RefreshCw } from "lucide-react"

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

  const oracleAddress = "0xF21FE4e177679fc0d2Aa0b7cB8BdE0b840409e25"
  const bwcTokenAddress = "0x57a8F55a341B0d157d45AceB5ea2BbaB623c882C"

  const oracleAbi = ["function getBWCPriceInUSD() view returns (uint256)"]

  const tokenAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ]

  useEffect(() => {
    loadPrice()
  }, [])

  async function loadPrice() {
    try {
      setIsPriceLoading(true)
      setError("")

      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask não detectada")
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider)

      const price = await oracle.getBWCPriceInUSD()
      const formattedPrice = Number(ethers.formatUnits(price, 18)).toFixed(4)
      setPrice(formattedPrice)
    } catch (error) {
      console.error("Erro ao carregar preço:", error)
      setError("Erro ao obter o preço. Verifique sua conexão com a blockchain.")
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
      await provider.send("eth_requestAccounts", [])

      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      setAddress(userAddress)

      const token = new ethers.Contract(bwcTokenAddress, tokenAbi, provider)
      const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider)

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
    } catch (error) {
      console.error("Erro ao conectar carteira:", error)
      setError("Erro ao conectar a carteira. Verifique se a MetaMask está desbloqueada e conectada à rede correta.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="w-full bg-white/5 backdrop-blur-sm border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">BWC Token Dashboard</CardTitle>
            <CardDescription className="text-gray-300">Verifique o preço e seu saldo de BWC Token</CardDescription>
          </CardHeader>

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
            <p className="w-full">Conecte-se à rede correta para visualizar seus tokens BWC</p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
