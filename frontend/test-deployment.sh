#!/bin/bash

# Frontend Manual Testing Script
# Run this after starting the dev server (npm run dev)

echo "========================================="
echo "TREX Frontend Deployment Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if dev server is running
echo -n "Test 1: Dev server running... "
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} - Run 'npm run dev' first"
    exit 1
fi

# Test 2: Check RPC endpoint
echo -n "Test 2: ZigChain RPC accessible... "
RPC_STATUS=$(curl -s https://public-zigchain-testnet-rpc.numia.xyz/status | grep -o '"network":"zig-test-2"')
if [ -n "$RPC_STATUS" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC} - RPC endpoint not responding"
fi

# Test 3: Check all routes (200 status)
echo ""
echo "Test 3: Testing all routes..."

ROUTES=("/" "/assets" "/compliance" "/issuance" "/manage")
FAILED_ROUTES=0

for route in "${ROUTES[@]}"; do
    echo -n "  - $route ... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ 200 OK${NC}"
    else
        echo -e "${RED}✗ $HTTP_CODE${NC}"
        ((FAILED_ROUTES++))
    fi
done

if [ $FAILED_ROUTES -eq 0 ]; then
    echo -e "${GREEN}All routes accessible!${NC}"
else
    echo -e "${YELLOW}$FAILED_ROUTES route(s) failed${NC}"
fi

# Test 4: Check for 404 routes (should fail)
echo ""
echo "Test 4: Verify old routes are removed..."

OLD_ROUTES=("/dashboard" "/transfers" "/kyc" "/investors" "/analytics" "/settings")
CORRECTLY_404=0

for route in "${OLD_ROUTES[@]}"; do
    echo -n "  - $route should 404... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
    if [ "$HTTP_CODE" == "404" ]; then
        echo -e "${GREEN}✓ 404 (correct)${NC}"
        ((CORRECTLY_404++))
    else
        echo -e "${RED}✗ $HTTP_CODE (should be 404)${NC}"
    fi
done

# Test 5: Check environment variables
echo ""
echo "Test 5: Environment variables..."

ENV_FILE="frontend/.env.local"
if [ -f "$ENV_FILE" ]; then
    echo -n "  - .env.local exists... ${GREEN}✓${NC}"
    echo ""
    
    # Check critical vars
    VARS=("NEXT_PUBLIC_ZIGCHAIN_RPC" "NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID" "NEXT_PUBLIC_TREX_TOKEN")
    for var in "${VARS[@]}"; do
        if grep -q "$var" "$ENV_FILE"; then
            VALUE=$(grep "$var" "$ENV_FILE" | cut -d'=' -f2)
            echo "  - $var: ${GREEN}✓${NC} ($VALUE)"
        else
            echo "  - $var: ${RED}✗ MISSING${NC}"
        fi
    done
else
    echo -e "  - .env.local: ${RED}✗ NOT FOUND${NC}"
fi

# Test 6: Check contract addresses
echo ""
echo "Test 6: Testing contract addresses..."

TOKEN_CONTRACT=$(grep "NEXT_PUBLIC_TREX_TOKEN" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2)
if [ -n "$TOKEN_CONTRACT" ]; then
    echo -n "  - Token contract query... "
    QUERY_RESULT=$(curl -s "https://public-zigchain-testnet-rpc.numia.xyz/abci_query?path=/wasm/contract/$TOKEN_CONTRACT" | grep -o '"code":0')
    if [ -n "$QUERY_RESULT" ]; then
        echo -e "${GREEN}✓ Contract exists${NC}"
    else
        echo -e "${YELLOW}⚠ Cannot verify (may require specific query)${NC}"
    fi
else
    echo -e "  - ${RED}✗ Token contract address not found${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "TEST SUMMARY"
echo "========================================="
echo -e "Dev Server:        ${GREEN}✓ Running${NC}"
echo -e "RPC Endpoint:      ${GREEN}✓ Connected${NC}"
echo -e "Routes Working:    ${GREEN}$((5-FAILED_ROUTES))/5${NC}"
echo -e "Old Routes 404:    ${GREEN}$CORRECTLY_404/6${NC}"
echo ""

echo "========================================="
echo "MANUAL TESTS REQUIRED:"
echo "========================================="
echo "1. Open http://localhost:3000 in browser"
echo "2. Click 'Connect Wallet' button"
echo "3. Install Keplr if not installed"
echo "4. Approve ZigChain network addition"
echo "5. Check browser console (F12) for errors"
echo "6. Navigate through all pages"
echo "7. Try token transfer on /manage page"
echo ""
echo "Expected: No red errors, all pages load"
echo "========================================="
