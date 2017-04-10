# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 6001, host: 6001, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 6003, host: 6003, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 35729, host: 35729, host_ip: "127.0.0.1"
  # config.vm.synced_folder ".", "/vagrant"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
    vb.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate//vagrant","1"]
  end

  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential git
    cd /vagrant
    npm install -g bower gulp
    sudo -H -u vagrant npm install
    sudo -H -u vagrant bower install

    # sudo apt-get install -y apache2
  SHELL
end
