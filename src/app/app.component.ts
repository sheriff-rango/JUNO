import { Component } from '@angular/core';
import { TransferService } from './_services/transfer.service';
import { TokenStorageService } from './_services/token-storage.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private roles: string[] = [];
  isLoggedIn = false;
  showAdminBoard = false;
  showModeratorBoard = false;
  username?: string;
  account: any;

  node: Node;
  constructor(
    private tokenStorageService: TokenStorageService,
    private transferService: TransferService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = !!this.tokenStorageService.getToken();

    if (this.isLoggedIn) {
      const user = this.tokenStorageService.getUser();
      this.roles = user.roles;

      this.showAdminBoard = this.roles.includes('ROLE_ADMIN');
      this.showModeratorBoard = this.roles.includes('ROLE_MODERATOR');

      this.username = user.username;
    }
  }

  logout(): void {
    this.tokenStorageService.signOut();
    window.location.reload();
  }

  async connectWallet(): Promise<void> {
    this.account = await this.transferService.getAccount();
    // const queryResult = await this.transferService.runQuery(
    //   'juno1h6ft2tkl5c85ve0c30jnv3cne0fmk4ma3gytqjv36cf78se5faxq977cwk',
    //   {
    //     get_white_users: {},
    //   }
    // );
    // console.log('query result', queryResult);
    // try {
    //   const executeResult = await this.transferService.runExecute(
    //     'juno1h6ft2tkl5c85ve0c30jnv3cne0fmk4ma3gytqjv36cf78se5faxq977cwk',
    //     {
    //       add_whit_user: {
    //         user: {
    //           address: this.account.address,
    //           email: '',
    //           name: '',
    //         },
    //       },
    //     }
    //   );
    //   console.log('execute result', executeResult);
    // } catch (e) {
    //   console.error('execute error', e);
    // }
  }
}
