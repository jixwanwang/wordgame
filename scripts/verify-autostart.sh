#!/bin/bash

# Verify that PM2 and Nginx are configured to auto-start on VM reboot
# Run this ON THE VM

echo "=== Auto-Start Verification ==="
echo ""

# Check PM2 startup configuration
echo "=== PM2 Auto-Start Status ==="
if systemctl list-unit-files | grep -q pm2; then
    echo "✓ PM2 systemd service is installed"
    systemctl status pm2-$USER.service --no-pager | head -5
else
    echo "✗ PM2 systemd service NOT found"
    echo "  Run: pm2 startup"
    echo "  Then run the command it outputs"
fi

echo ""
echo "PM2 saved processes:"
pm2 list

echo ""
echo "PM2 startup command to run on boot:"
pm2 startup systemd -u $USER --hp $HOME | tail -1

echo ""
echo ""

# Check Nginx auto-start configuration
echo "=== Nginx Auto-Start Status ==="
if systemctl is-enabled nginx &>/dev/null; then
    echo "✓ Nginx is enabled to start on boot"
    systemctl status nginx --no-pager | head -5
else
    echo "✗ Nginx is NOT enabled to start on boot"
    echo "  Run: sudo systemctl enable nginx"
fi

echo ""
echo ""

# Summary
echo "=== Summary ==="
echo ""

PM2_ENABLED=false
NGINX_ENABLED=false

if systemctl list-unit-files | grep -q pm2; then
    PM2_ENABLED=true
fi

if systemctl is-enabled nginx &>/dev/null; then
    NGINX_ENABLED=true
fi

if [ "$PM2_ENABLED" = true ] && [ "$NGINX_ENABLED" = true ]; then
    echo "✓ Both PM2 and Nginx are configured to auto-start on reboot"
    echo ""
    echo "To test, run: sudo reboot"
    echo "After reboot, check with: pm2 status && sudo systemctl status nginx"
elif [ "$PM2_ENABLED" = true ]; then
    echo "⚠ PM2 is configured but Nginx is NOT"
    echo "  Fix: sudo systemctl enable nginx"
elif [ "$NGINX_ENABLED" = true ]; then
    echo "⚠ Nginx is configured but PM2 is NOT"
    echo "  Fix: pm2 startup && pm2 save"
else
    echo "✗ Neither PM2 nor Nginx are configured to auto-start"
    echo "  Run setup scripts or configure manually"
fi
