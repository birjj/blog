# Using GitHub Actions to automate testing and publishing of PowerShell modules

I've recently had to dip my toes into PowerShell module development. Being far from an expert on PowerShell or the community around it, I found it a bit daunting to setup my module development space for the first time. For the sake of saving you (and me) the trouble of going through that again, I'll be describing my module development setup here. This will largely focus on the actual code layout, and not so much on the PowerShell code.

## Project goals

I found that all the project templates I could find lacked a few things that were important to me. These include:

- Automate where possible, including automatic testing (CI) and deployment (CD). As little publishing-related stuff should happen on my local machine as possible.
- Easily write-able and run-able tests. The chore of writing tests for modules should be simplified as much as possible, with easy ways to unit test both private and public functions.
- As little code-duplication as possible. If I've written something once, I shouldn't have to copy-paste the file over to every new project I create (which would cause problems when I later have to update it).

Given these requirements, [Catesta](https://github.com/techthoughts2/Catesta) appeared to be the project template that got closest - with a few changes required.

## Initial project setup

Before setting up, you'll have to decide on whether you want a monorepo, or want to use a new repository for each module. The differences are rather slight, mostly revolving around how contributions happen to each module; but in my case I found that a lot of my modules were related to eachother, and as such chose to use a monorepo, with each project being represented by a folder in a shared repository.

Setting up the basic project for a module is simple enough, using Catesta to provide the boilerplate:

```powershell
# install Catesta from the PSGallery
Install-Module -Name Catesta -Repository PSGallery -Scope CurrentUser
# run Catesta to set up a new project
# when run this will prompt you for some basic information: the name of the module, a description, etc.
# choose the options that work best for you; I usually do changelog and GitHub files, MIT license, OTBS coding style and platyPS for documentation
New-PowerShellProject -CICDChoice 'GitHubActions' -DestinationPath './Module-Name' # you can just use `-DestinationPath '.'` if you aren't doing the monorepo thing
```

This will set up a general module structure for development. While this structure largely fit my needs (and has been designed by people much smarter than me), I did find that I needed to make a few changes:

- Improve `actions_boostrap.ps1`. This is a file Catesta sets up to install the necessary modules. However, I found that not only was this file incredibly slow when ran in a CI environment, as it forced installs of modules even if already installed, but it would also sometimes fail (e.g. if you had a PowerShell instance open with one of the modules imported). I added the following to improve on it:
    
    ```diff
    'Installing PowerShell Modules'
    foreach ($module in $modulesToInstall) {
        $installSplat = @{
            Name               = $module.ModuleName
            RequiredVersion    = $module.ModuleVersion
            Repository         = 'PSGallery'
            SkipPublisherCheck = $true
            Force              = $true
            ErrorAction        = 'Stop'
        }
    +   $curVersion = Get-Module $module.ModuleName | Select-Object -ExpandProperty Version
    +   if ($curVersion -eq $module.ModuleVersion) {
    +       "  - Already installed $($module.ModuleName) ${curVersion}, skipping"
    +       continue
    +   }
        try {
    +       "  - Installing $($module.ModuleName) $($module.ModuleVersion) (from old version ${curVersion})"
            Install-Module @installSplat
            Import-Module -Name $module.ModuleName -ErrorAction Stop
    +       $newVersion = Get-Module $module.ModuleName | Select-Object -ExpandProperty Version
    +       if ($newVersion -ne $module.ModuleVersion) {
    +           throw "New version ${newVersion} does not match expected $($module.ModuleVersion)"
    +       }
            '  - Successfully installed {0}' -f $module.ModuleName
        }
        catch {
            $message = 'Failed to install {0}' -f $module.ModuleName
            "  - $message"
            throw
        }
    }
    ```
