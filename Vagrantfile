VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
    config.vm.box = "scotch/box"
    config.vm.box_version = "~> 2.0"
    config.vm.network "private_network", ip: "10.124.0.4"
    config.vm.synced_folder '.', '/vagrant', nfs: true

    host = RbConfig::CONFIG['host_os']

    config.vm.provider "virtualbox" do |v|
        host = RbConfig::CONFIG['host_os']

        # Give VM 1/4 system memory
        if host =~ /darwin/
            # sysctl returns Bytes and we need to convert to MB
            mem = `sysctl -n hw.memsize`.to_i / 1024
        elsif host =~ /linux/
            # meminfo shows KB and we need to convert to MB
            mem = `grep 'MemTotal' /proc/meminfo | sed -e 's/MemTotal://' -e 's/ kB//'`.to_i
        elsif host =~ /mswin|mingw|cygwin/
            # Windows code via https://github.com/rdsubhas/vagrant-faster
            mem = `wmic computersystem Get TotalPhysicalMemory`.split[1].to_i / 1024
        end

        mem = mem / 1024 / 4
        v.customize ["modifyvm", :id, "--memory", mem]
    end

    config.vm.network :forwarded_port, host: 33060, guest: 3306
    config.vm.network :forwarded_port, host: 4567, guest: 80,
        auto_config: false
    config.vm.network :forwarded_port, host: 4578, guest: 443
    config.vm.provision :shell, path: "vagrant_utils/bootstrap.sh"
    config.vm.provider "virtualbox" do |vb|
        ### Change network card to PCnet-FAST III
        # For NAT adapter
        vb.customize ["modifyvm", :id, "--nictype1", "Am79C973"]
        # For host-only adapter
        vb.customize ["modifyvm", :id, "--nictype2", "Am79C973"]
      end
    config.vm.provision "shell", inline: <<-SHELL
        rm -f /etc/network/interfaces.d/eth1.cfg
        echo "auto eth1" >> /etc/network/interfaces.d/eth1.cfg
        echo "iface eth1 inet static" >> /etc/network/interfaces.d/eth1.cfg
        echo "address 192.168.35.25" >> /etc/network/interfaces.d/eth1.cfg
        echo "netmask 255.255.255.0" >> /etc/network/interfaces.d/eth1.cfg
        ifdown eth1 && ifup eth1
      SHELL
end
