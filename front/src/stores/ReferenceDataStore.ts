import { makeAutoObservable, runInAction } from 'mobx';
import { companiesApi, contactsApi, companyRolesApi, usersApi, type Company, type Contact, type CompanyRole, type User } from '../api/client';

class ReferenceDataStore {
  companies: Company[] = [];
  contacts: Contact[] = [];
  companyRoles: CompanyRole[] = [];
  users: User[] = [];
  
  isLoading = false;
  error: string | null = null;
  
  // Флаги для отслеживания загруженных данных
  isCompaniesLoaded = false;
  isContactsLoaded = false;
  isCompanyRolesLoaded = false;
  isUsersLoaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Загрузка всех справочных данных
  async loadAllReferenceData() {
    if (this.isCompaniesLoaded && this.isContactsLoaded && this.isCompanyRolesLoaded && this.isUsersLoaded) {
      return; // Все данные уже загружены
    }

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      // Загружаем все данные параллельно
      const [companiesData, companyRolesData, usersData] = await Promise.all([
        companiesApi.getAll(),
        companyRolesApi.getAll(),
        usersApi.getAll()
      ]);

      // Загружаем все контакты одним запросом
      const allContactsData = await contactsApi.getAll();

      runInAction(() => {
        this.companies = companiesData;
        this.contacts = allContactsData;
        this.companyRoles = companyRolesData;
        this.users = usersData;
        
        this.isCompaniesLoaded = true;
        this.isContactsLoaded = true;
        this.isCompanyRolesLoaded = true;
        this.isUsersLoaded = true;
      });
      
    } catch (error) {
      console.error('Error loading reference data:', error);
      runInAction(() => {
        this.error = `Ошибка загрузки справочных данных: ${error.message || 'Неизвестная ошибка'}`;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Получить контакты для конкретной компании
  getContactsByCompany(companyId: number): Contact[] {
    return this.contacts.filter(contact => contact.company_id === companyId);
  }

  // Получить контакты для списка компаний
  getContactsByCompanies(companyIds: number[]): Contact[] {
    return this.contacts.filter(contact => companyIds.includes(contact.company_id));
  }

  // Получить название компании по ID
  getCompanyName(companyId: number): string {
    const company = this.companies.find(c => c.id === companyId);
    return company?.name || 'Неизвестная компания';
  }

  // Получить название контакта
  getContactName(contactId: number): string {
    const contact = this.contacts.find(c => c.id === contactId);
    return contact?.full_name || 'Неизвестный контакт';
  }

  // Получить название роли компании
  getCompanyRoleName(roleId: number): string {
    const role = this.companyRoles.find(r => r.id === roleId);
    return role?.name || 'Неизвестная роль';
  }

  // Получить название пользователя
  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user?.full_name || 'Неизвестный пользователь';
  }

  // Очистка данных
  clearAll() {
    this.companies = [];
    this.contacts = [];
    this.companyRoles = [];
    this.users = [];
    this.isCompaniesLoaded = false;
    this.isContactsLoaded = false;
    this.isCompanyRolesLoaded = false;
    this.isUsersLoaded = false;
    this.error = null;
  }
}

export default new ReferenceDataStore();
