import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, UserPlus } from 'lucide-react';
import { CreateUsersButton } from '@/components/ui/create-users-button';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Erro de Login",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro de Login",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Erro de Cadastro",
            description: "Este email já está cadastrado. Faça login ou use outro email.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro de Cadastro",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Cadastro Realizado",
          description: "Conta criada com sucesso! Você pode fazer login agora.",
        });
        setIsSignUp(false);
        setPassword('');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-green-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-emerald-900/30"></div>
      
      {/* Animated shapes for depth */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Main login card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* User icon at top */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-emerald-800 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Toggle between Login and Sign Up */}
            <div className="flex justify-center mb-8">
              <div className="flex bg-white/10 rounded-full p-1 border border-white/20">
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    !isSignUp 
                      ? 'bg-emerald-700 text-white shadow-lg' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Login
                </button>
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isSignUp 
                      ? 'bg-emerald-700 text-white shadow-lg' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Cadastro
                </button>
              </div>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/50" />
                </div>
                <Input
                  type="email"
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 transition-all duration-300"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/50" />
                </div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:bg-white/20 focus:border-white/40 transition-all duration-300"
                />
              </div>

              {/* Remember me and forgot password */}
              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="border-white/30 data-[state=checked]:bg-emerald-600" />
                    <label htmlFor="remember" className="text-white/70 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-white/70 hover:text-white transition-colors duration-300"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isSignUp ? 'Criando conta...' : 'Entrando...'}
                  </>
                ) : (
                  isSignUp ? 'CRIAR CONTA' : 'LOGIN'
                )}
              </Button>
            </form>

            {/* Development tools */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="text-center">
                <p className="text-sm text-white/60 mb-3">
                  Ferramentas de desenvolvimento:
                </p>
                <CreateUsersButton />
              </div>
            </div>
          </div>

          {/* System title */}
          <div className="text-center mt-8">
            <h1 className="text-2xl font-bold text-white/90 mb-2">
              Sistema de Recrutamento
            </h1>
            <p className="text-white/60">
              Flow Nobre - Gestão de Processo Seletivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}