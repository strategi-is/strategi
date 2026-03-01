import { prisma } from '../prisma/client';

interface CreateCompanyInput {
  userId: string;
  name: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  keyDifferentiators: string;
  brandVoiceNotes?: string;
  brandVoiceFileUrl?: string;
  competitors: { name?: string; websiteUrl: string }[];
}

interface UpdateCompanyInput {
  name?: string;
  websiteUrl?: string;
  industry?: string;
  targetAudience?: string;
  productsServices?: string;
  keyDifferentiators?: string;
  brandVoiceNotes?: string;
  brandVoiceFileUrl?: string;
  competitors?: { name?: string; websiteUrl: string }[];
}

export class CompanyService {
  async create(input: CreateCompanyInput) {
    const { competitors, ...companyData } = input;

    return prisma.company.create({
      data: {
        ...companyData,
        competitors: {
          create: competitors.slice(0, 5), // max 5 competitors per PRD
        },
      },
      include: { competitors: true },
    });
  }

  async getAll(userId: string) {
    return prisma.company.findMany({
      where: { userId },
      include: { competitors: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: string, userId: string) {
    return prisma.company.findFirst({
      where: { id, userId },
      include: {
        competitors: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, status: true, createdAt: true, completedAt: true,
            geoScore: { select: { overallScore: true } },
          },
        },
      },
    });
  }

  async update(id: string, userId: string, input: UpdateCompanyInput) {
    // Verify ownership
    const company = await prisma.company.findFirst({ where: { id, userId } });
    if (!company) return null;

    const { competitors, ...rest } = input;

    // Replace competitors atomically if provided
    if (competitors !== undefined) {
      await prisma.competitor.deleteMany({ where: { companyId: id } });
      return prisma.company.update({
        where: { id },
        data: {
          ...rest,
          competitors: { create: competitors.slice(0, 5) },
        },
        include: { competitors: true },
      });
    }

    return prisma.company.update({
      where: { id },
      data: rest,
      include: { competitors: true },
    });
  }

  async delete(id: string, userId: string) {
    const company = await prisma.company.findFirst({ where: { id, userId } });
    if (!company) return false;
    await prisma.company.delete({ where: { id } });
    return true;
  }

  async getQueries(companyId: string, userId: string) {
    // Verify ownership
    const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
    if (!company) return null;

    return prisma.targetQuery.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCustomQuery(
    companyId: string,
    userId: string,
    query: string,
    buyerStage: 'AWARENESS' | 'CONSIDERATION' | 'DECISION',
  ) {
    const company = await prisma.company.findFirst({ where: { id: companyId, userId } });
    if (!company) return null;

    return prisma.targetQuery.create({
      data: { companyId, query, buyerStage, isCustom: true },
    });
  }

  async deleteQuery(queryId: string, userId: string) {
    const query = await prisma.targetQuery.findFirst({
      where: { id: queryId, company: { userId } },
    });
    if (!query) return false;
    await prisma.targetQuery.delete({ where: { id: queryId } });
    return true;
  }
}

export const companyService = new CompanyService();
