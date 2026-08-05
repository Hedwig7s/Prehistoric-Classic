{ pkgs, config, ... }: {
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_26;
  };
  enterShell = ''
    export PATH="$PATH:$DEVENV_ROOT/node_modules/@nubjs/nub/bin"
  '';
}
