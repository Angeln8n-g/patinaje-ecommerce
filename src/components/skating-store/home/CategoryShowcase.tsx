"use client";

import Link from "next/link";
import Image from "next/image";
import { Category } from "@/types/skating-store";
import { ChevronRight, Disc, Footprints, Shield, Shirt, Package, Component,
  Wrench, Star, Heart, Zap, Tag, ShoppingBag, ShoppingCart, Gift, Award, Crown, Gem, Flame,
  Bike, Car, Truck, Plane, Rocket, Anchor, Compass, Map, MapPin, Globe,
  Headphones, Music, Camera, Film, Tv, Monitor, Smartphone, Tablet, Watch, Gamepad2,
  Dumbbell, Trophy, Target, Flag, Timer, Gauge, Swords, CircleDot,
  Sun, Moon, Cloud, Snowflake, Droplets, Wind, Thermometer, Umbrella,
  Scissors, Paintbrush, Palette, PenTool, Ruler, Hammer, Cog,
  BookOpen, GraduationCap, Lightbulb, Brain, Eye, Glasses,
  Apple, Coffee, UtensilsCrossed, Wine, IceCreamCone, Candy, Leaf, TreePine, Flower2,
  Dog, Cat, Bug, Fish, Bird,
  Baby, Users, UserCircle, Smile, HandMetal, Sparkles, PartyPopper,
  Lock, Key, ShieldCheck, AlertTriangle, Ban, CheckCircle, XCircle,
  Wifi, Bluetooth, Battery, Plug, Cable, Cpu, HardDrive, Database,
  Wallet, CreditCard, Banknote, PiggyBank, Receipt, BarChart3, TrendingUp,
  Home, Building2, Store, Warehouse, DoorOpen, Bed, Sofa, Lamp,
  Stethoscope, Pill, Syringe, Microscope, Dna, HeartPulse,
  Briefcase, FileText, Folder, Inbox, Send, Mail, Phone, MessageCircle,
  Calendar, Clock, AlarmClock, Hourglass, RotateCcw,
  ArrowUpDown, Layers, Grid3X3, LayoutGrid, Box, Boxes, Archive, Bookmark
} from "lucide-react";
import { useEffect, useState } from "react";
import { getStaticContentClient } from "@/lib/skating-store/supabase-queries";

interface CategoryShowcaseProps {
  categories?: Category[];
}

// Map icon names to Lucide components
const lucideIconMap: Record<string, React.ReactNode> = {
  Package: <Package className="h-8 w-8" />, Component: <Component className="h-8 w-8" />, Footprints: <Footprints className="h-8 w-8" />,
  Shield: <Shield className="h-8 w-8" />, Disc: <Disc className="h-8 w-8" />, Shirt: <Shirt className="h-8 w-8" />,
  Wrench: <Wrench className="h-8 w-8" />, Star: <Star className="h-8 w-8" />, Heart: <Heart className="h-8 w-8" />,
  Zap: <Zap className="h-8 w-8" />, Tag: <Tag className="h-8 w-8" />, ShoppingBag: <ShoppingBag className="h-8 w-8" />,
  ShoppingCart: <ShoppingCart className="h-8 w-8" />, Gift: <Gift className="h-8 w-8" />, Award: <Award className="h-8 w-8" />,
  Crown: <Crown className="h-8 w-8" />, Gem: <Gem className="h-8 w-8" />, Flame: <Flame className="h-8 w-8" />,
  Bike: <Bike className="h-8 w-8" />, Car: <Car className="h-8 w-8" />, Truck: <Truck className="h-8 w-8" />,
  Plane: <Plane className="h-8 w-8" />, Rocket: <Rocket className="h-8 w-8" />, Anchor: <Anchor className="h-8 w-8" />,
  Compass: <Compass className="h-8 w-8" />, Map: <Map className="h-8 w-8" />, MapPin: <MapPin className="h-8 w-8" />,
  Globe: <Globe className="h-8 w-8" />, Headphones: <Headphones className="h-8 w-8" />, Music: <Music className="h-8 w-8" />,
  Camera: <Camera className="h-8 w-8" />, Film: <Film className="h-8 w-8" />, Tv: <Tv className="h-8 w-8" />,
  Monitor: <Monitor className="h-8 w-8" />, Smartphone: <Smartphone className="h-8 w-8" />, Tablet: <Tablet className="h-8 w-8" />,
  Watch: <Watch className="h-8 w-8" />, Gamepad2: <Gamepad2 className="h-8 w-8" />, Dumbbell: <Dumbbell className="h-8 w-8" />,
  Trophy: <Trophy className="h-8 w-8" />, Target: <Target className="h-8 w-8" />, Flag: <Flag className="h-8 w-8" />,
  Timer: <Timer className="h-8 w-8" />, Gauge: <Gauge className="h-8 w-8" />, Swords: <Swords className="h-8 w-8" />,
  CircleDot: <CircleDot className="h-8 w-8" />, Sun: <Sun className="h-8 w-8" />, Moon: <Moon className="h-8 w-8" />,
  Cloud: <Cloud className="h-8 w-8" />, Snowflake: <Snowflake className="h-8 w-8" />, Droplets: <Droplets className="h-8 w-8" />,
  Wind: <Wind className="h-8 w-8" />, Thermometer: <Thermometer className="h-8 w-8" />, Umbrella: <Umbrella className="h-8 w-8" />,
  Scissors: <Scissors className="h-8 w-8" />, Paintbrush: <Paintbrush className="h-8 w-8" />, Palette: <Palette className="h-8 w-8" />,
  PenTool: <PenTool className="h-8 w-8" />, Ruler: <Ruler className="h-8 w-8" />, Hammer: <Hammer className="h-8 w-8" />,
  Cog: <Cog className="h-8 w-8" />, BookOpen: <BookOpen className="h-8 w-8" />, GraduationCap: <GraduationCap className="h-8 w-8" />,
  Lightbulb: <Lightbulb className="h-8 w-8" />, Brain: <Brain className="h-8 w-8" />, Eye: <Eye className="h-8 w-8" />,
  Glasses: <Glasses className="h-8 w-8" />, Apple: <Apple className="h-8 w-8" />, Coffee: <Coffee className="h-8 w-8" />,
  UtensilsCrossed: <UtensilsCrossed className="h-8 w-8" />, Wine: <Wine className="h-8 w-8" />, IceCreamCone: <IceCreamCone className="h-8 w-8" />,
  Candy: <Candy className="h-8 w-8" />, Leaf: <Leaf className="h-8 w-8" />, TreePine: <TreePine className="h-8 w-8" />,
  Flower2: <Flower2 className="h-8 w-8" />, Dog: <Dog className="h-8 w-8" />, Cat: <Cat className="h-8 w-8" />,
  Bug: <Bug className="h-8 w-8" />, Fish: <Fish className="h-8 w-8" />, Bird: <Bird className="h-8 w-8" />,
  Baby: <Baby className="h-8 w-8" />, Users: <Users className="h-8 w-8" />, UserCircle: <UserCircle className="h-8 w-8" />,
  Smile: <Smile className="h-8 w-8" />, HandMetal: <HandMetal className="h-8 w-8" />, Sparkles: <Sparkles className="h-8 w-8" />,
  PartyPopper: <PartyPopper className="h-8 w-8" />, Lock: <Lock className="h-8 w-8" />, Key: <Key className="h-8 w-8" />,
  ShieldCheck: <ShieldCheck className="h-8 w-8" />, AlertTriangle: <AlertTriangle className="h-8 w-8" />, Ban: <Ban className="h-8 w-8" />,
  CheckCircle: <CheckCircle className="h-8 w-8" />, XCircle: <XCircle className="h-8 w-8" />, Wifi: <Wifi className="h-8 w-8" />,
  Bluetooth: <Bluetooth className="h-8 w-8" />, Battery: <Battery className="h-8 w-8" />, Plug: <Plug className="h-8 w-8" />,
  Cable: <Cable className="h-8 w-8" />, Cpu: <Cpu className="h-8 w-8" />, HardDrive: <HardDrive className="h-8 w-8" />,
  Database: <Database className="h-8 w-8" />, Wallet: <Wallet className="h-8 w-8" />, CreditCard: <CreditCard className="h-8 w-8" />,
  Banknote: <Banknote className="h-8 w-8" />, PiggyBank: <PiggyBank className="h-8 w-8" />, Receipt: <Receipt className="h-8 w-8" />,
  BarChart3: <BarChart3 className="h-8 w-8" />, TrendingUp: <TrendingUp className="h-8 w-8" />, Home: <Home className="h-8 w-8" />,
  Building2: <Building2 className="h-8 w-8" />, Store: <Store className="h-8 w-8" />, Warehouse: <Warehouse className="h-8 w-8" />,
  DoorOpen: <DoorOpen className="h-8 w-8" />, Bed: <Bed className="h-8 w-8" />, Sofa: <Sofa className="h-8 w-8" />,
  Lamp: <Lamp className="h-8 w-8" />, Stethoscope: <Stethoscope className="h-8 w-8" />, Pill: <Pill className="h-8 w-8" />,
  Syringe: <Syringe className="h-8 w-8" />, Microscope: <Microscope className="h-8 w-8" />, Dna: <Dna className="h-8 w-8" />,
  HeartPulse: <HeartPulse className="h-8 w-8" />, Briefcase: <Briefcase className="h-8 w-8" />, FileText: <FileText className="h-8 w-8" />,
  Folder: <Folder className="h-8 w-8" />, Inbox: <Inbox className="h-8 w-8" />, Send: <Send className="h-8 w-8" />,
  Mail: <Mail className="h-8 w-8" />, Phone: <Phone className="h-8 w-8" />, MessageCircle: <MessageCircle className="h-8 w-8" />,
  Calendar: <Calendar className="h-8 w-8" />, Clock: <Clock className="h-8 w-8" />, AlarmClock: <AlarmClock className="h-8 w-8" />,
  Hourglass: <Hourglass className="h-8 w-8" />, RotateCcw: <RotateCcw className="h-8 w-8" />, ArrowUpDown: <ArrowUpDown className="h-8 w-8" />,
  Layers: <Layers className="h-8 w-8" />, Grid3X3: <Grid3X3 className="h-8 w-8" />, LayoutGrid: <LayoutGrid className="h-8 w-8" />,
  Box: <Box className="h-8 w-8" />, Boxes: <Boxes className="h-8 w-8" />, Archive: <Archive className="h-8 w-8" />,
  Bookmark: <Bookmark className="h-8 w-8" />,
};

const getCategoryIcon = (slug: string, iconName?: string, iconUrl?: string) => {
  if (iconUrl) {
    return <Image src={iconUrl} alt={slug} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />;
  }
  if (iconName && lucideIconMap[iconName]) {
    return lucideIconMap[iconName];
  }
  // Fallback por slug
  if (slug.includes('patines')) return <Footprints className="h-8 w-8" />;
  if (slug.includes('ruedas')) return <Disc className="h-8 w-8" />;
  if (slug.includes('botas')) return <Footprints className="h-8 w-8" />;
  if (slug.includes('protecciones')) return <Shield className="h-8 w-8" />;
  if (slug.includes('accesorios')) return <Package className="h-8 w-8" />;
  if (slug.includes('bases')) return <Component className="h-8 w-8" />;
  return null;
};

export function CategoryShowcase({ categories = [] }: CategoryShowcaseProps) {
  const displayCategories = categories.length > 0 ? categories : [];
  const [speed, setSpeed] = useState(40);

  useEffect(() => {
    getStaticContentClient('site-settings').then(settings => {
      if (settings?.data && typeof settings.data.carousel_speed === 'number') {
        setSpeed(settings.data.carousel_speed);
      }
    });
  }, []);

  return (
    <section className="mb-12 container mx-auto px-4">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
        <Link href="/skating-store/catalogo" className="text-sm text-muted-foreground hover:text-primary flex items-center">
          See all <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {displayCategories.length === 0 ? (
        <p className="text-muted-foreground">No hay categorías disponibles.</p>
      ) : (
        <div className="relative w-full overflow-hidden pause-on-hover">
          <div 
            className="flex gap-8 w-full md:w-max overflow-x-auto md:overflow-hidden pb-4 md:pb-0 justify-start md:justify-center animate-none md:animate-infinite-scroll hover:animation-play-state-paused touch-pan-x snap-x snap-mandatory md:snap-none no-scrollbar"
            style={{ 
              animationDuration: `${speed}s`,
            }}
          >
            {/* Duplicamos las categorías para crear el efecto de bucle infinito suave solo en desktop */}
            {[...displayCategories, ...displayCategories, ...displayCategories].map((category, index) => (
              <Link 
                key={`${category.id}-${index}`} 
                href={`/skating-store/catalogo?category=${category.slug}`} 
                className="group flex flex-col items-center gap-3 min-w-[80px] snap-center shrink-0"
              >
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-secondary border border-border flex items-center justify-center transition-all group-hover:bg-primary group-hover:shadow-lg group-hover:scale-105">
                  {/* Icon or Letter */}
                  <div className="text-muted-foreground group-hover:text-primary-foreground">
                     {getCategoryIcon(category.slug, category.icon_name, category.icon_url) || (
                       <span className="text-2xl font-bold">
                         {category.name.charAt(0).toUpperCase()}
                       </span>
                     )}
                  </div>
                </div>
                <span className="text-sm font-medium text-center truncate w-full group-hover:text-primary transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
