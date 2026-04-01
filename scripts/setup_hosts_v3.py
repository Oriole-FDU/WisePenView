import os
import sys
import platform
import shutil
import datetime

# ================= Configuration =================
# 使用字典来管理多组映射，方便后续扩展
HOSTS_MAPPINGS = {
    "wisepen-prod-server": "10.176.44.11",
    "wisepen-dev-server": "10.162.161.201"
}
# =================================================

def get_hosts_path():
    """Get the path to the hosts file based on the OS."""
    system = platform.system()
    if system == "Windows":
        return r"C:\Windows\System32\drivers\etc\hosts"
    else:
        # Linux or macOS
        return "/etc/hosts"

def is_admin():
    """Check if the script is running with administrative privileges."""
    try:
        with open(get_hosts_path(), 'a+'):
            pass
        return True
    except PermissionError:
        return False
    except Exception as e:
        print(f"Permission check error: {e}")
        return False

def backup_hosts(hosts_path):
    """Create a timestamped backup of the hosts file."""
    try:
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        backup_path = f"{hosts_path}.{timestamp}.bak"
        shutil.copy(hosts_path, backup_path)
        print(f"Backup created at: {backup_path}")
        return True
    except Exception as e:
        print(f"Backup failed: {e}")
        return False

def flush_dns():
    """Flush DNS cache based on the OS."""
    print("Attempting to flush DNS cache...")
    try:
        if platform.system() == "Windows":
            os.system("ipconfig /flushdns")
        elif platform.system() == "Darwin": # macOS
            os.system("sudo killall -HUP mDNSResponder")
        print("DNS cache flushed.")
    except Exception as e:
        print(f"Failed to flush DNS: {e}")

def clean_hosts():
    """Remove the configuration from the hosts file."""
    print("Starting cleanup process...")
    hosts_path = get_hosts_path()

    if not is_admin():
        print_permission_error()
        return

    if not backup_hosts(hosts_path):
        return

    try:
        with open(hosts_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        removed = False
        target_domains = HOSTS_MAPPINGS.keys()

        for line in lines:
            stripped_line = line.strip()
            # 忽略空行或注释行
            if not stripped_line or stripped_line.startswith('#'):
                new_lines.append(line)
                continue

            parts = stripped_line.split()
            # 检查行中是否包含我们需要清理的域名
            if any(domain in parts[1:] for domain in target_domains):
                removed = True
                print(f"Removing line: {stripped_line}")
            else:
                new_lines.append(line)

        if removed:
            with open(hosts_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print("Successfully removed configurations.")
            flush_dns()
        else:
            print("No configuration found for target domains. Nothing to clean.")

    except Exception as e:
        print(f"Cleanup failed: {e}")

def setup_hosts():
    """Add or update the configuration in the hosts file."""
    print("Starting setup process...")
    hosts_path = get_hosts_path()

    if not is_admin():
        print_permission_error()
        return

    if not backup_hosts(hosts_path):
        return

    try:
        with open(hosts_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        new_lines = []
        updated = False
        # 记录已经成功验证或更新的域名
        handled_domains = set()

        for line in lines:
            stripped_line = line.strip()
            if not stripped_line or stripped_line.startswith('#'):
                new_lines.append(line)
                continue

            parts = stripped_line.split()
            if len(parts) >= 2:
                current_ip = parts[0]
                domains_in_line = parts[1:]

                # 寻找当前行是否包含我们需要配置的域名
                matched_domain = next((d for d in HOSTS_MAPPINGS.keys() if d in domains_in_line), None)

                if matched_domain:
                    target_ip = HOSTS_MAPPINGS[matched_domain]
                    if current_ip == target_ip:
                        print(f"Configuration for '{matched_domain}' already exists and is correct.")
                        new_lines.append(line)
                    else:
                        print(f"Updating IP for '{matched_domain}' to: {target_ip}...")
                        new_lines.append(f"{target_ip} {matched_domain}\n")
                        updated = True
                    handled_domains.add(matched_domain)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        # 追加尚未处理的域名映射
        for domain, ip in HOSTS_MAPPINGS.items():
            if domain not in handled_domains:
                if new_lines and not new_lines[-1].endswith('\n'):
                    new_lines[-1] += '\n'
                new_lines.append(f"{ip} {domain}\n")
                print(f"Adding new configuration: {ip} {domain}")
                updated = True

        if updated:
            with open(hosts_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print("Hosts file modified successfully!")
            flush_dns()
            print("\nSetup Complete! You can now use the configured domains to connect.")

    except Exception as e:
        print(f"Setup failed: {e}")

def print_permission_error():
    print("\nError: Permission denied!")
    if platform.system() == "Windows":
        print("Please right-click and 'Run as Administrator'.")
    else:
        print("Please run with sudo.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].lower() == 'clean':
        clean_hosts()
    else:
        setup_hosts()