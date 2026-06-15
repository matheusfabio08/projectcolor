import { useState, useEffect } from "react";
import Layout from "@/react-app/components/Layout";
import { useAPI } from "@/react-app/hooks/useAPI";
import { Settings, Users, Edit2, Save, X, UserPlus, UserCog, Trash2 } from "lucide-react";
import { User, Employee } from "@/shared/types";

type Tab = "users" | "employees";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const { data: users, request: requestUsers } = useAPI<User[]>();
  const { data: employees, request: requestEmployees } = useAPI<Employee[]>();
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Create user form fields
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Almoxarifado");

  // Employee management
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editEmployeeSector, setEditEmployeeSector] = useState("");
  const [editEmployeeActive, setEditEmployeeActive] = useState(true);
  const [showCreateEmployeeForm, setShowCreateEmployeeForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeSector, setNewEmployeeSector] = useState("Preparação");
  const [filterSector, setFilterSector] = useState("Todos");

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === "employees") {
      fetchEmployees();
    }
  }, [filterSector]);

  const fetchUsers = async () => {
    try {
      await requestUsers("/api/admin/users");
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      await requestEmployees(`/api/employees?sector=${filterSector}`);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    setEditRole(user.role);
    setEditActive(!!user.is_active);
  };

  const handleSaveUser = async (userId: string) => {
    try {
      await requestUsers(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          role: editRole,
          is_active: editActive,
        }),
      });

      alert("Usuário atualizado com sucesso!");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      alert("Erro ao atualizar usuário");
    }
  };

  const handleCancelUser = () => {
    setEditingUser(null);
    setEditRole("");
    setEditActive(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername || !newPassword || !newName || !newEmail || !newRole) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    try {
      await requestUsers("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          email: newEmail,
          role: newRole,
        }),
      });

      alert("Usuário criado com sucesso!");
      setShowCreateForm(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewEmail("");
      setNewRole("Almoxarifado");
      fetchUsers();
    } catch (error) {
      alert("Erro ao criar usuário. Verifique se o nome de usuário já existe.");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee.id);
    setEditEmployeeName(employee.name);
    setEditEmployeeSector(employee.sector);
    setEditEmployeeActive(!!employee.is_active);
  };

  const handleSaveEmployee = async (employeeId: number) => {
    try {
      await requestEmployees(`/api/employees/${employeeId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editEmployeeName,
          sector: editEmployeeSector,
          is_active: editEmployeeActive,
        }),
      });

      alert("Funcionário atualizado com sucesso!");
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      alert("Erro ao atualizar funcionário");
    }
  };

  const handleCancelEmployee = () => {
    setEditingEmployee(null);
    setEditEmployeeName("");
    setEditEmployeeSector("");
    setEditEmployeeActive(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmployeeName || !newEmployeeSector) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    try {
      await requestEmployees("/api/employees", {
        method: "POST",
        body: JSON.stringify({
          name: newEmployeeName,
          sector: newEmployeeSector,
        }),
      });

      alert("Funcionário criado com sucesso!");
      setShowCreateEmployeeForm(false);
      setNewEmployeeName("");
      setNewEmployeeSector("Preparação");
      fetchEmployees();
    } catch (error) {
      alert("Erro ao criar funcionário");
    }
  };

  const handleDeleteEmployee = async (employeeId: number, employeeName: string) => {
    if (confirm(`Tem certeza que deseja excluir o funcionário "${employeeName}"?`)) {
      try {
        await requestEmployees(`/api/employees/${employeeId}`, {
          method: "DELETE",
        });

        alert("Funcionário excluído com sucesso!");
        fetchEmployees();
      } catch (error) {
        alert("Erro ao excluir funcionário");
      }
    }
  };

  const roles = [
    "Admin",
    "Almoxarifado",
    "Preparação",
    "Produção",
    "Secadora",
    "Destrinchagem",
    "Enrolagem",
    "Qualidade",
    "Laboratório",
  ];

  const sectors = ["Preparação", "Produção", "Box 4", "Box 5", "Box 6", "Pesagem", "Destrinchagem", "Enrolagem", "Qualidade de Malhas", "Todos"];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Settings className="w-8 h-8 mr-3 text-blue-600" />
              Administração
            </h1>
            <p className="text-gray-600">Gerenciar usuários e funcionários do sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "users"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Users className="w-5 h-5" />
            Usuários do Sistema
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === "employees"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <UserCog className="w-5 h-5" />
            Funcionários da Produção
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                <span>Novo Usuário</span>
              </button>
            </div>

            {/* Create User Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateUser} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Usuário</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome de Usuário *
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ex: joao.silva"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Senha *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Senha do usuário"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="João Silva"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="joao@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Setor/Função *
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewUsername("");
                      setNewPassword("");
                      setNewName("");
                      setNewEmail("");
                      setNewRole("Almoxarifado");
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Criar Usuário
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-900">Usuários com Acesso ao Sistema</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Setor/Função
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{user.name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {(user as any).username || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === user.id ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              >
                                {roles.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === user.id ? (
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editActive}
                                  onChange={(e) => setEditActive(e.target.checked)}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700">Ativo</span>
                              </label>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {user.is_active ? "Ativo" : "Inativo"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === user.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveUser(user.id)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                                  title="Salvar"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelUser}
                                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  Filtrar por setor:
                  <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                onClick={() => setShowCreateEmployeeForm(!showCreateEmployeeForm)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                <span>Novo Funcionário</span>
              </button>
            </div>

            {/* Create Employee Form */}
            {showCreateEmployeeForm && (
              <form onSubmit={handleCreateEmployee} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cadastrar Novo Funcionário</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome do Funcionário *
                    </label>
                    <input
                      type="text"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Setor *
                    </label>
                    <select
                      value={newEmployeeSector}
                      onChange={(e) => setNewEmployeeSector(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {sectors.filter(s => s !== "Todos").map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateEmployeeForm(false);
                      setNewEmployeeName("");
                      setNewEmployeeSector("Preparação");
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Cadastrar Funcionário
                  </button>
                </div>
              </form>
            )}

            {/* Employees Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex items-center">
                  <UserCog className="w-6 h-6 text-green-600 mr-3" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Funcionários da Produção
                    {filterSector !== "Todos" && ` - ${filterSector}`}
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Setor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employees && employees.length > 0 ? (
                      employees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingEmployee === employee.id ? (
                              <input
                                type="text"
                                value={editEmployeeName}
                                onChange={(e) => setEditEmployeeName(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{employee.name}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingEmployee === employee.id ? (
                              <select
                                value={editEmployeeSector}
                                onChange={(e) => setEditEmployeeSector(e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              >
                                {sectors.filter(s => s !== "Todos").map((sector) => (
                                  <option key={sector} value={sector}>
                                    {sector}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                {employee.sector}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingEmployee === employee.id ? (
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={editEmployeeActive}
                                  onChange={(e) => setEditEmployeeActive(e.target.checked)}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700">Ativo</span>
                              </label>
                            ) : (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  employee.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {employee.is_active ? "Ativo" : "Inativo"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingEmployee === employee.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveEmployee(employee.id)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                                  title="Salvar"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEmployee}
                                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditEmployee(employee)}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Nenhum funcionário encontrado
                          {filterSector !== "Todos" && ` no setor de ${filterSector}`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Informações</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Usuários do Sistema:</strong> Pessoas que fazem login e têm acesso às páginas do sistema</p>
            <p><strong>Funcionários da Produção:</strong> Operadores que aparecem nas listas ao registrar tarefas em cada setor</p>
            <p>• Funcionários podem ter setor "Todos" para aparecer em todas as listas</p>
            <p>• Você pode filtrar funcionários por setor para facilitar a visualização</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
